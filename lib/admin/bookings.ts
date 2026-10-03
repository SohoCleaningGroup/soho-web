import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { timeclockEnabled } from "@/lib/timeclock/service";
export const adminBookingInclude = {
  userProfile: { select: { fullName: true, city: true, address: true } },
  jobAssignment: { include: { professional: { select: { fullName: true } }, ...(timeclockEnabled() ? { timecards: { include: { events: true }, orderBy: { startedAt: "desc" as const } } } : {}) } },
} satisfies Prisma.BookingInclude;
export async function adminBookings(where: Prisma.BookingWhereInput, take = 5, orderBy: Prisma.BookingOrderByWithRelationInput = { createdAt: "desc" }) {
  return prisma.booking.findMany({ where, include: adminBookingInclude, take, orderBy });
}
