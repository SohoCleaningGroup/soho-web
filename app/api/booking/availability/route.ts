import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  estimateCleaningDurationMinutes,
  getBookingCapacity,
  getTravelBufferMinutes,
  hasBookingSlotStarted,
  isSlotAvailable,
  BOOKING_TIME_SLOTS,
  type BookingTimeSlot,
} from "@/lib/scheduling/booking-availability";
import type {
  CleaningType,
  HomeSize,
} from "@/lib/pricing/cleaning-pricing";
import { getClientIp, rateLimit } from "@/lib/security/request";

const SUPPORTED_CLEANING_TYPES = new Set<CleaningType>([
  "SOHO_SIGNATURE",
  "SOHO_SIGNATURE_DEEP",
  "MOVE_IN_MOVE_OUT",
  "RECURRING",
]);

const SUPPORTED_HOME_SIZES = new Set<HomeSize>([
  "1BHK",
  "2BHK",
  "3BHK",
  "4BHK",
]);

export async function GET(request: Request) {
  const limited = rateLimit(
    `availability:${getClientIp(request)}`,
    60,
    10 * 60 * 1000
  );
  if (limited) return limited;

  const requestUrl = new URL(request.url);
  const dateValue = requestUrl.searchParams.get("date");
  const cleaningTypeValue = requestUrl.searchParams.get("cleaningType");
  const homeSizeValue = requestUrl.searchParams.get("homeSize");
  const totalSqftValue = Number(requestUrl.searchParams.get("totalSqft"));
  const selectedAddOns = requestUrl.searchParams
    .getAll("addOn")
    .filter(Boolean);

  const preferredDate = dateValue ? new Date(dateValue) : null;

  if (!preferredDate || Number.isNaN(preferredDate.getTime())) {
    return NextResponse.json(
      { success: false, message: "Select a valid date." },
      { status: 400 }
    );
  }

  const requestedDay = preferredDate.getUTCDay();
  if (requestedDay === 0 || requestedDay === 6) {
    return NextResponse.json(
      {
        success: false,
        message: "Bookings are available Monday through Friday.",
      },
      { status: 400 }
    );
  }

  if (
    !cleaningTypeValue ||
    !SUPPORTED_CLEANING_TYPES.has(cleaningTypeValue as CleaningType) ||
    !homeSizeValue ||
    !SUPPORTED_HOME_SIZES.has(homeSizeValue as HomeSize) ||
    !Number.isFinite(totalSqftValue) ||
    totalSqftValue < 100
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Complete the service and home details first.",
      },
      { status: 400 }
    );
  }

  const cleaningType = cleaningTypeValue as CleaningType;
  const homeSize = homeSizeValue as HomeSize;
  const requestedDurationMinutes = estimateCleaningDurationMinutes({
    cleaningType,
    homeSize,
    totalSqft: totalSqftValue,
    selectedAddOns,
  });

  const dayStart = new Date(preferredDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const now = new Date();

  await prisma.bookingSlotHold.deleteMany({
    where: { expiresAt: { lte: now } },
  });

  const [bookings, holds] = await Promise.all([
    prisma.booking.findMany({
      where: {
        preferredDate: { gte: dayStart, lt: dayEnd },
        status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] },
      },
      select: {
        preferredTime: true,
        estimatedDurationMinutes: true,
      },
    }),
    prisma.bookingSlotHold.findMany({
      where: {
        preferredDate: { gte: dayStart, lt: dayEnd },
        expiresAt: { gt: now },
      },
      select: {
        preferredTime: true,
        estimatedDurationMinutes: true,
      },
    }),
  ]);

  const intervals = [...bookings, ...holds];
  const capacity = getBookingCapacity();
  const travelBufferMinutes = getTravelBufferMinutes();

  const unavailableSlots = BOOKING_TIME_SLOTS.filter(
    (slot) =>
      hasBookingSlotStarted(preferredDate, slot, now) ||
      !isSlotAvailable({
        requestedSlot: slot as BookingTimeSlot,
        requestedDurationMinutes,
        intervals,
        capacity,
        travelBufferMinutes,
      })
  );

  return NextResponse.json({
    success: true,
    capacity,
    estimatedDurationMinutes: requestedDurationMinutes,
    travelBufferMinutes,
    unavailableSlots,
  });
}
