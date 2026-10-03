import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getJob } from "@/lib/jobs/service";
import { tokenHash } from "@/lib/jobs/rules";
import { locationSnapshot, validatePeriod } from "./rules";

export function timeclockEnabled() {
  if (process.env.CLEANER_TIMECLOCK_ENABLED) return process.env.CLEANER_TIMECLOCK_ENABLED === "true";
  // Initially enable only the approved staging branch and its isolated database.
  return process.env.VERCEL_ENV === "preview" &&
    process.env.VERCEL_GIT_COMMIT_REF === "staging/vercel-replacement" &&
    (process.env.DATABASE_URL || "").includes("oaarnwczslhbpfxchygu");
}
export function requireTimeclock() {
  if (!timeclockEnabled()) throw new Error("Time tracking is not enabled yet.");
}
const clockInclude = { events: { orderBy: { createdAt: "asc" as const } } };
export async function workerTimecards(assignmentId: string) {
  return prisma.cleanerTimecard.findMany({ where: { assignmentId }, include: clockInclude, orderBy: { startedAt: "desc" } });
}
async function workerLock(tx: Prisma.TransactionClient, professionalId: string) {
  // Serialize all clock/approval actions for a cleaner, even across different jobs.
  await tx.$queryRaw`SELECT id FROM "ProfessionalProfile" WHERE id = ${professionalId} FOR UPDATE`;
}
async function assertNoOverlap(tx: Prisma.TransactionClient, professionalId: string, start: Date, end: Date | null, exclude?: string) {
  const other = await tx.cleanerTimecard.findFirst({ where: {
    professionalId, ...(exclude ? { id: { not: exclude } } : {}),
    ...(end ? { startedAt: { lt: end } } : {}),
    OR: [{ endedAt: null }, { endedAt: { gt: start } }],
  } });
  if (other) throw new Error("These hours overlap another timecard. Contact SoHo to review it.");
}
export async function clockWorker(token: string, action: string, rawLocation: unknown, expectedTimecardId?: string) {
  requireTimeclock();
  if (action !== "in" && action !== "out") throw new Error("Choose clock in or clock out.");
  const location = locationSnapshot(rawLocation);
  const found = await getJob(token);
  if (!found) throw new Error("Invalid or expired job link.");
  return prisma.$transaction(async tx => {
    await workerLock(tx, found.professionalId);
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${found.bookingId} FOR UPDATE`;
    const job = await tx.jobAssignment.findUnique({ where: { id: found.id }, include: { professional: true, booking: true } });
    if (!job || job.professionalId !== found.professionalId || job.tokenHash !== tokenHash(token) ||
        job.expiresAt.getTime() <= Date.now()) throw new Error("Invalid or expired job link.");
    const now = new Date();
    let card;
    if (action === "in") {
      if (job.status !== "ACCEPTED" || job.professional.status !== "APPROVED" || !job.professional.hiringTermsSignedAt ||
          ["CANCELLED", "COMPLETED"].includes(job.booking.status)) throw new Error("This job is not available for clock-in.");
      await assertNoOverlap(tx, job.professionalId, now, null);
      card = await tx.cleanerTimecard.create({ data: { assignmentId: job.id, professionalId: job.professionalId, startedAt: now } });
    } else {
      if (!expectedTimecardId) throw new Error("Refresh the page and choose the active timecard.");
      const open = await tx.cleanerTimecard.findFirst({ where: { id: expectedTimecardId, assignmentId: job.id, professionalId: job.professionalId } });
      if (!open) throw new Error("Timecard not found.");
      if (open.endedAt) return open; // A repeated clock-out must not close a subsequent shift.
      validatePeriod(open.startedAt, now);
      card = await tx.cleanerTimecard.update({ where: { id: open.id }, data: { endedAt: now, status: "PENDING", revision: { increment: 1 } } });
    }
    await tx.cleanerClockEvent.create({ data: { timecardId: card.id, kind: action === "in" ? "CLOCK_IN" : "CLOCK_OUT", actor: "WORKER", detail: { location } } });
    return card;
  });
}

export async function reviewTimecard(id: string, revision: number, action: string, note: string, startAt?: string, endAt?: string) {
  requireTimeclock();
  if (!["approve", "correct"].includes(action) || !Number.isInteger(revision) ||
      !note.trim() || note.length > 1000) throw new Error("Add a review note (up to 1,000 characters).");
  const found = await prisma.cleanerTimecard.findUnique({ where: { id } });
  if (!found) throw new Error("Timecard not found.");
  return prisma.$transaction(async tx => {
    await workerLock(tx, found.professionalId);
    const card = await tx.cleanerTimecard.findUniqueOrThrow({ where: { id } });
    if (card.revision !== revision) throw new Error("This timecard changed. Refresh before reviewing it.");
    if (!card.endedAt && action === "approve") throw new Error("Clock-out is required before approval.");
    const start = action === "correct" ? new Date(startAt || "") : card.startedAt;
    const end = action === "correct" ? new Date(endAt || "") : card.endedAt!;
    validatePeriod(start, end);
    await assertNoOverlap(tx, card.professionalId, start, end, card.id);
    const updated = await tx.cleanerTimecard.update({ where: { id }, data: {
      startedAt: start, endedAt: end, status: action === "approve" ? "APPROVED" : "PENDING",
      approvedAt: action === "approve" ? new Date() : null, approvalNote: action === "approve" ? note.trim() : null,
      revision: { increment: 1 },
    } });
    await tx.cleanerClockEvent.create({ data: { timecardId: id, kind: action === "approve" ? "APPROVED" : "CORRECTED",
      actor: "ADMIN", detail: { note: note.trim(),
        before: { start: card.startedAt.toISOString(), end: card.endedAt?.toISOString() || null },
        after: { start: start.toISOString(), end: end.toISOString() } } } });
    return updated;
  });
}

export async function setJobLocation(assignmentId: string, latitude: number, longitude: number, radius: number) {
  requireTimeclock();
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 ||
      !Number.isInteger(radius) || radius < 25 || radius > 1000) throw new Error("Enter valid job coordinates and a radius of 25–1,000 meters.");
  return prisma.$transaction(async tx => {
    const assignment = await tx.jobAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    await workerLock(tx, assignment.professionalId);
    const before = await tx.jobAssignment.findUniqueOrThrow({ where: { id: assignmentId } });
    const updated = await tx.jobAssignment.update({ where: { id: assignmentId }, data: { siteLatitude: latitude, siteLongitude: longitude, siteRadiusMeters: radius } });
    const cards = await tx.cleanerTimecard.findMany({ where: { assignmentId }, select: { id: true } });
    if (cards.length) await tx.cleanerClockEvent.createMany({ data: cards.map(card => ({
      timecardId: card.id, kind: "SITE_CHANGED", actor: "ADMIN", detail: {
        note: "Job location updated; distance checks use the current job location.",
        oldCoordinates: { latitude: before.siteLatitude, longitude: before.siteLongitude, radius: before.siteRadiusMeters },
        newCoordinates: { latitude, longitude, radius },
      },
    })) });
    return updated;
  });
}
