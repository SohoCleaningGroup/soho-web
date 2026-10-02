import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  parseCleanerAvailabilityWindows,
  verifyCleanerAvailabilityToken,
} from "@/lib/scheduling/cleaner-weekly-availability";
import { getClientIp, rateLimit } from "@/lib/security/request";

export async function POST(request: Request) {
  const limited = rateLimit(
    `cleaner-availability:${getClientIp(request)}`,
    20,
    10 * 60 * 1000
  );
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request." },
      { status: 400 }
    );
  }

  const professionalId =
    typeof body.professionalId === "string" ? body.professionalId : "";
  const token = typeof body.token === "string" ? body.token : undefined;
  const weekStartValue =
    typeof body.weekStart === "string" ? body.weekStart : "";
  const windows = parseCleanerAvailabilityWindows(body.windows);

  if (
    !professionalId ||
    !verifyCleanerAvailabilityToken(token, professionalId) ||
    !windows
  ) {
    return NextResponse.json(
      { success: false, message: "This availability link is invalid." },
      { status: 403 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartValue)) {
    return NextResponse.json(
      { success: false, message: "Choose a valid week." },
      { status: 400 }
    );
  }

  const weekStart = new Date(`${weekStartValue}T00:00:00.000Z`);
  if (Number.isNaN(weekStart.getTime()) || weekStart.getUTCDay() !== 1) {
    return NextResponse.json(
      { success: false, message: "The week must start on a Monday." },
      { status: 400 }
    );
  }

  const now = new Date();
  const earliest = new Date(now);
  earliest.setUTCDate(earliest.getUTCDate() - 7);
  const latest = new Date(now);
  latest.setUTCDate(latest.getUTCDate() + 84);

  if (weekStart < earliest || weekStart > latest) {
    return NextResponse.json(
      { success: false, message: "Choose a week within the next 12 weeks." },
      { status: 400 }
    );
  }

  const professional = await prisma.professionalProfile.findFirst({
    where: { id: professionalId, status: "APPROVED" },
    select: { id: true },
  });

  if (!professional) {
    return NextResponse.json(
      { success: false, message: "Cleaner profile is not active." },
      { status: 403 }
    );
  }

  await prisma.cleanerWeeklyAvailability.upsert({
    where: {
      professionalId_weekStart: {
        professionalId,
        weekStart,
      },
    },
    update: {
      windows,
      submittedAt: new Date(),
    },
    create: {
      professionalId,
      weekStart,
      windows,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Your availability has been saved.",
  });
}
