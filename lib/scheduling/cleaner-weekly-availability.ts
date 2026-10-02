import "server-only";

import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";

export type CleanerAvailabilityWindow = {
  weekday: 1 | 2 | 3 | 4 | 5;
  startMinutes: number;
  endMinutes: number;
};

type AvailabilityToken = {
  purpose: "cleaner-availability";
  professionalId: string;
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 180;

function availabilitySecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }
  return secret;
}

export function createCleanerAvailabilityToken(professionalId: string) {
  return createSignedToken(
    { purpose: "cleaner-availability" as const, professionalId },
    availabilitySecret(),
    TOKEN_TTL_SECONDS
  );
}

export function verifyCleanerAvailabilityToken(
  token: string | undefined,
  professionalId: string
) {
  const parsed = verifySignedToken<AvailabilityToken>(
    token,
    availabilitySecret()
  );

  return (
    parsed?.purpose === "cleaner-availability" &&
    parsed.professionalId === professionalId
  );
}

export function weekStartUtc(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  const day = date.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date;
}

export function upcomingMondayUtc(now = new Date()) {
  const current = new Date(now);
  current.setUTCHours(0, 0, 0, 0);
  const day = current.getUTCDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  current.setUTCDate(current.getUTCDate() + daysUntilMonday);
  return current;
}

export function parseCleanerAvailabilityWindows(value: unknown) {
  if (!Array.isArray(value)) return null;

  const windows: CleanerAvailabilityWindow[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const weekday = Number(record.weekday);
    const startMinutes = Number(record.startMinutes);
    const endMinutes = Number(record.endMinutes);

    if (
      !Number.isInteger(weekday) ||
      weekday < 1 ||
      weekday > 5 ||
      !Number.isInteger(startMinutes) ||
      !Number.isInteger(endMinutes) ||
      startMinutes < 8 * 60 ||
      endMinutes > 18 * 60 ||
      endMinutes <= startMinutes ||
      startMinutes % 30 !== 0 ||
      endMinutes % 30 !== 0
    ) {
      return null;
    }

    windows.push({
      weekday: weekday as CleanerAvailabilityWindow["weekday"],
      startMinutes,
      endMinutes,
    });
  }

  if (windows.length > 10) return null;
  return windows;
}

export function cleanerCapacityAtServiceMinute({
  schedules,
  weekday,
  serviceMinute,
}: {
  schedules: { windows: unknown }[];
  weekday: number;
  serviceMinute: number;
}) {
  const minuteOfDay = 8 * 60 + serviceMinute;

  return schedules.reduce((count, schedule) => {
    const windows = parseCleanerAvailabilityWindows(schedule.windows) ?? [];
    const available = windows.some(
      (window) =>
        window.weekday === weekday &&
        minuteOfDay >= window.startMinutes &&
        minuteOfDay + 30 <= window.endMinutes
    );

    return count + (available ? 1 : 0);
  }, 0);
}
