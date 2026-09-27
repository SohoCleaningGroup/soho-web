import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/security/request";

const TIME_SLOTS = [
  "08:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
] as const;

function getBookingCapacity() {
  const parsedCapacity = Number(process.env.CLEANING_BOOKING_CAPACITY || "1");

  return Number.isInteger(parsedCapacity) &&
    parsedCapacity >= 1 &&
    parsedCapacity <= 10
    ? parsedCapacity
    : 1;
}

export async function GET(request: Request) {
  const limited = rateLimit(
    `availability:${getClientIp(request)}`,
    60,
    10 * 60 * 1000
  );
  if (limited) return limited;

  const requestUrl = new URL(request.url);
  const dateValue = requestUrl.searchParams.get("date");
  const preferredDate = dateValue ? new Date(dateValue) : null;

  if (!preferredDate || Number.isNaN(preferredDate.getTime())) {
    return NextResponse.json(
      { success: false, message: "Select a valid date." },
      { status: 400 }
    );
  }

  const dayStart = new Date(preferredDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const now = new Date();
  const bookingCapacity = getBookingCapacity();

  await prisma.bookingSlotHold.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  const [bookings, holds] = await Promise.all([
    prisma.booking.findMany({
      where: {
        preferredDate: { gte: dayStart, lt: dayEnd },
        preferredTime: { in: [...TIME_SLOTS] },
        status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] },
      },
      select: { preferredTime: true },
    }),
    prisma.bookingSlotHold.findMany({
      where: {
        preferredDate: { gte: dayStart, lt: dayEnd },
        preferredTime: { in: [...TIME_SLOTS] },
        expiresAt: { gt: now },
      },
      select: { preferredTime: true },
    }),
  ]);

  const occupiedTimes = [
    ...bookings.map((booking) => booking.preferredTime),
    ...holds.map((hold) => hold.preferredTime),
  ];

  const unavailableSlots = TIME_SLOTS.filter((slot, requestedIndex) => {
    const conflictCount = occupiedTimes.filter((occupiedTime) => {
      const occupiedIndex = TIME_SLOTS.indexOf(
        occupiedTime as (typeof TIME_SLOTS)[number]
      );

      return (
        occupiedIndex >= 0 &&
        Math.abs(occupiedIndex - requestedIndex) <= 1
      );
    }).length;

    return conflictCount >= bookingCapacity;
  });

  return NextResponse.json({
    success: true,
    capacity: bookingCapacity,
    unavailableSlots,
  });
}
