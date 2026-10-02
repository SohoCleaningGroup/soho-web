import type { Metadata } from "next";

import CleanerAvailabilityForm from "./AvailabilityForm";
import { prisma } from "@/lib/prisma";
import {
  parseCleanerAvailabilityWindows,
  upcomingMondayUtc,
  verifyCleanerAvailabilityToken,
} from "@/lib/scheduling/cleaner-weekly-availability";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CleanerAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ professionalId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { professionalId } = await params;
  const { token } = await searchParams;

  if (!verifyCleanerAvailabilityToken(token, professionalId)) {
    return <InvalidLink />;
  }

  const professional = await prisma.professionalProfile.findFirst({
    where: { id: professionalId, status: "APPROVED" },
    select: { id: true, fullName: true },
  });

  if (!professional || !token) {
    return <InvalidLink />;
  }

  const weekStart = upcomingMondayUtc();
  const saved = await prisma.cleanerWeeklyAvailability.findUnique({
    where: {
      professionalId_weekStart: {
        professionalId,
        weekStart,
      },
    },
    select: { windows: true },
  });

  return (
    <CleanerAvailabilityForm
      professionalId={professionalId}
      token={token}
      cleanerName={professional.fullName}
      initialWeekStart={weekStart.toISOString().slice(0, 10)}
      initialWindows={parseCleanerAvailabilityWindows(saved?.windows) ?? []}
    />
  );
}

function InvalidLink() {
  return (
    <main className="min-h-screen bg-[#060606] px-4 py-16 text-white">
      <div className="mx-auto max-w-lg rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-8 text-center">
        <h1 className="font-serif text-3xl">Availability link unavailable</h1>
        <p className="mt-4 text-sm leading-7 text-[#cfc7b7]">
          Ask SoHo Cleaning Group for a fresh availability link.
        </p>
      </div>
    </main>
  );
}
