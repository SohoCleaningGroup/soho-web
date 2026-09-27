import type { CleaningType, HomeSize } from "@/lib/pricing/cleaning-pricing";

export const BOOKING_TIME_SLOTS = [
  "08:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
] as const;

export type BookingTimeSlot = (typeof BOOKING_TIME_SLOTS)[number];

const BASE_DURATION_MINUTES: Record<
  CleaningType,
  Record<HomeSize, number>
> = {
  SOHO_SIGNATURE: {
    "1BHK": 120,
    "2BHK": 150,
    "3BHK": 180,
    "4BHK": 210,
  },
  SOHO_SIGNATURE_DEEP: {
    "1BHK": 180,
    "2BHK": 210,
    "3BHK": 240,
    "4BHK": 270,
  },
  MOVE_IN_MOVE_OUT: {
    "1BHK": 240,
    "2BHK": 270,
    "3BHK": 300,
    "4BHK": 330,
  },
  RECURRING: {
    "1BHK": 120,
    "2BHK": 150,
    "3BHK": 180,
    "4BHK": 210,
  },
  AIRBNB_TURNOVER: {
    "1BHK": 150,
    "2BHK": 180,
    "3BHK": 210,
    "4BHK": 240,
  },
};

const INCLUDED_SQFT: Record<HomeSize, number> = {
  "1BHK": 700,
  "2BHK": 1100,
  "3BHK": 1600,
  "4BHK": 2200,
};

export function estimateCleaningDurationMinutes({
  cleaningType,
  homeSize,
  totalSqft,
  selectedAddOns = [],
}: {
  cleaningType: CleaningType;
  homeSize: HomeSize;
  totalSqft: number;
  selectedAddOns?: string[];
}) {
  const base = BASE_DURATION_MINUTES[cleaningType]?.[homeSize] ?? 180;
  const includedSqft = INCLUDED_SQFT[homeSize] ?? totalSqft;
  const extraSqft = Math.max(0, totalSqft - includedSqft);
  const extraSqftMinutes = Math.ceil(extraSqft / 500) * 30;
  const addOnMinutes = selectedAddOns.includes("INSIDE_FRIDGE") ? 30 : 0;

  return Math.min(8 * 60, base + extraSqftMinutes + addOnMinutes);
}

export function getTravelBufferMinutes() {
  const parsed = Number(process.env.CLEANING_TRAVEL_BUFFER_MINUTES || "60");

  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 180
    ? parsed
    : 60;
}

export function getBookingCapacity() {
  const parsed = Number(process.env.CLEANING_BOOKING_CAPACITY || "1");

  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10
    ? parsed
    : 1;
}

function slotStartMinutes(slot: string) {
  const match = /^(\d{2}):(\d{2})-/.exec(slot);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  return (hour - 8) * 60 + minute;
}

export type ScheduledInterval = {
  preferredTime: string | null;
  durationMinutes: number | null;
};

export function isSlotAvailable({
  requestedSlot,
  requestedDurationMinutes,
  intervals,
  capacity,
  travelBufferMinutes,
}: {
  requestedSlot: BookingTimeSlot;
  requestedDurationMinutes: number;
  intervals: ScheduledInterval[];
  capacity: number;
  travelBufferMinutes: number;
}) {
  const requestedStart = slotStartMinutes(requestedSlot);
  if (requestedStart === null) return false;

  const requestedEnd =
    requestedStart + requestedDurationMinutes + travelBufferMinutes;

  // Scan in 30-minute increments across the proposed job + travel buffer.
  // Capacity is exhausted only when that many existing jobs/holds overlap
  // the same point in time.
  for (
    let minute = requestedStart;
    minute < requestedEnd;
    minute += 30
  ) {
    let overlapping = 0;

    for (const interval of intervals) {
      if (!interval.preferredTime) continue;

      const existingStart = slotStartMinutes(interval.preferredTime);
      if (existingStart === null) continue;

      const existingDuration =
        interval.durationMinutes && interval.durationMinutes > 0
          ? interval.durationMinutes
          : 120;

      const existingEnd =
        existingStart + existingDuration + travelBufferMinutes;

      if (minute < existingEnd && minute + 30 > existingStart) {
        overlapping += 1;
      }
    }

    if (overlapping >= capacity) {
      return false;
    }
  }

  return true;
}
