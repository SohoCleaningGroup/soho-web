import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendgrid";
import { canUpload, JOB_LINK_SECONDS, newJobToken, requireOpenJob, tokenHash } from "./rules";

export const PHOTO_BUCKET = "job-completion-photos";
const include = { booking: { include: { userProfile: true } }, professional: true, photos: true } as const;
function jobBaseUrl() {
  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return process.env.VERCEL_ENV === "preview" && previewHost ? `https://${previewHost}` : process.env.NEXT_PUBLIC_APP_URL;
}
export function jobUrl(kind: "jobs" | "review", token: string) {
  const base = jobBaseUrl();
  if (!base || !/^https:\/\//.test(base)) throw new Error("The website URL is not configured.");
  return `${base.replace(/\/$/, "")}/${kind}/${token}`;
}
export async function getJob(token: string, review = false) {
  let hash: string; try { hash = tokenHash(token); } catch { return null; }
  return prisma.jobAssignment.findFirst({ where: review
    ? { reviewTokenHash: hash, reviewExpiresAt: { gt: new Date() }, status: "ACCEPTED" }
    : { tokenHash: hash, expiresAt: { gt: new Date() } }, include });
}
export async function lockedJob<T>(token: string, review: boolean, fn: (tx: Prisma.TransactionClient, job: NonNullable<Awaited<ReturnType<typeof getJob>>>) => Promise<T>) {
  const found = await getJob(token, review);
  if (!found) throw new Error("Invalid or expired job link.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${found.bookingId} FOR UPDATE`;
    const job = await tx.jobAssignment.findUnique({ where: { id: found.id }, include });
    if (!job || (review ? job.reviewTokenHash : job.tokenHash) !== tokenHash(token)
      || (review ? job.reviewExpiresAt : job.expiresAt)!.getTime() <= Date.now()) throw new Error("Invalid or expired job link.");
    requireOpenJob(job.booking.status);
    return fn(tx, job);
  }, { timeout: 15000 });
}
function emailHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.6">${text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\n", "<br>")}</div>`;
}
export async function sendJobEmail(to: string[], subject: string, text: string) {
  return sendEmail({ to, subject: `SoHo Cleaning Group — ${subject}`, text, html: emailHtml(text) });
}
export async function notifyJobOwner(bookingId: string, message: string, feedback?: string) {
  const to = (process.env.ADMIN_NOTIFICATION_EMAILS || "").split(",").map(x => x.trim()).filter(Boolean);
  if (!to.length) return false;
  const url = jobBaseUrl() || "";
  return sendJobEmail(to, message, `${message}\nBooking: ${bookingId}${feedback ? `\nCustomer feedback: ${feedback}` : ""}\nManage this booking in admin:\n${url}/admin/dashboard/bookings/${bookingId}`);
}
export async function inviteWorker(bookingId: string, professionalId: string) {
  const token = newJobToken(); const link = jobUrl("jobs", token);
  const job = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { jobAssignment: true } });
    if (!booking) throw new Error("Booking not found.");
    requireOpenJob(booking.status);
    if (booking.jobAssignment?.status === "ACCEPTED" && booking.jobAssignment.professionalId !== professionalId) throw new Error("This booking already has an accepted worker. Contact the worker before reassigning.");
    const worker = await tx.professionalProfile.findUnique({ where: { id: professionalId } });
    if (!worker || worker.status !== "APPROVED") throw new Error("Choose an approved worker.");
    if (booking.jobAssignment?.status === "ACCEPTED") {
      return tx.jobAssignment.update({ where: { bookingId }, data: { tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + JOB_LINK_SECONDS * 1000) }, include });
    }
    const data = { professionalId, tokenHash: tokenHash(token), expiresAt: new Date(Date.now() + JOB_LINK_SECONDS * 1000), status: "PENDING", respondedAt: null,
      reviewTokenHash: null, reviewExpiresAt: null, reviewStatus: "NONE", reviewNote: null, reviewedAt: null, reviewSentAt: null };
    return tx.jobAssignment.upsert({ where: { bookingId }, create: { bookingId, ...data }, update: data, include });
  });
  const date = job.booking.preferredDate?.toLocaleDateString("en-US", { timeZone: "America/New_York" }) || "To be confirmed";
  const followUp = job.status === "ACCEPTED" && job.reviewStatus === "ATTENTION";
  const emailSent = await sendJobEmail([job.professional.email], followUp ? "Please address the customer's cleaning feedback" : "Cleaning assignment", followUp
    ? `Hello ${job.professional.fullName},\nThe customer has asked us to address something on this cleaning.\nCustomer feedback: ${job.reviewNote || "Please contact SoHo for the details."}\nOpen your private job page:\n${link}\nAddress the feedback, upload photos showing the follow-up work, then select Cleaning nearly done — send review so the customer can review again.\nThe booking remains on hold for completion and payment capture until the customer approves.\nThis private link expires in 14 days. Do not forward it.`
    : `Hello ${job.professional.fullName},\nYou have been offered a ${job.booking.cleaningType.replaceAll("_", " ").toLowerCase()} cleaning on ${date} at ${job.booking.preferredTime || "a time to be confirmed"}.\nOpen your job page to accept or decline:\n${link}\nThis private link expires in 14 days. Do not forward it.`);
  return { emailSent, followUp };
}
export async function respondWorker(token: string, action: string) {
  const result = await lockedJob(token, false, async (tx, job) => {
    if (action !== "accept" && action !== "decline") throw new Error("Invalid response.");
    const status = action === "accept" ? "ACCEPTED" : "DECLINED";
    if (job.status === status) return { bookingId: job.bookingId, changed: false, status };
    if (job.status !== "PENDING") throw new Error("You have already responded. Contact SoHo to change your response.");
    if (job.professional.status !== "APPROVED") throw new Error("Contact SoHo about this assignment.");
    await tx.jobAssignment.update({ where: { id: job.id }, data: { status, respondedAt: new Date() } });
    if (status === "ACCEPTED") await tx.booking.update({ where: { id: job.bookingId }, data: { status: "ASSIGNED" } });
    return { bookingId: job.bookingId, changed: true, status };
  });
  if (result.changed) await notifyJobOwner(result.bookingId, `Worker ${result.status.toLowerCase()} the assignment`);
}
export async function requestCustomerReview(token: string) {
  const reviewToken = newJobToken(); const link = jobUrl("review", reviewToken);
  const { job, previousReviewStatus } = await lockedJob(token, false, async (tx, job) => {
    if (!canUpload(job.status, job.reviewStatus)) throw new Error("This job is not ready for another review request.");
    if (!job.photos.length) throw new Error("Upload at least one finished-job photo first.");
    const previousReviewStatus = job.reviewStatus;
    const updated = await tx.jobAssignment.update({ where: { id: job.id }, data: { reviewTokenHash: tokenHash(reviewToken), reviewExpiresAt: new Date(Date.now() + JOB_LINK_SECONDS * 1000), reviewStatus: "AWAITING", reviewNote: job.reviewNote, reviewedAt: null, reviewSentAt: null }, include });
    return { job: updated, previousReviewStatus };
  });
  const emailSent = await sendJobEmail([job.booking.userProfile.email], "Your cleaning is nearly done — review the photos", `Hello ${job.booking.userProfile.fullName},\nYour cleaner has uploaded photos of the finished cleaning. Please review them and choose Everything looks good or Something needs attention:\n${link}\nLet us know about anything that needs attention before we finalize the job. Your response does not charge your card; SoHo reviews it before capturing payment.\nThis private link expires in 14 days.`);
  if (!emailSent) {
    await prisma.jobAssignment.updateMany({ where: { id: job.id, reviewTokenHash: tokenHash(reviewToken), reviewStatus: "AWAITING" }, data: { reviewStatus: previousReviewStatus, reviewTokenHash: null, reviewExpiresAt: null } });
  } else {
    await prisma.jobAssignment.updateMany({ where: { id: job.id, reviewTokenHash: tokenHash(reviewToken) }, data: { reviewSentAt: new Date() } });
    await notifyJobOwner(job.bookingId, "Cleaning is nearly done — customer review requested");
  }
  return { emailSent };
}
export async function respondCustomer(token: string, action: string, note: string) {
  const result = await lockedJob(token, true, async (tx, job) => {
    if (job.status !== "ACCEPTED" || job.reviewStatus !== "AWAITING") throw new Error("This review already has a response. Contact SoHo if you need help.");
    if (action !== "approve" && action !== "attention") throw new Error("Choose a review response.");
    if (note.length > 2000 || (action === "attention" && !note.trim())) throw new Error("Describe what needs attention (up to 2,000 characters).");
    await tx.jobAssignment.update({ where: { id: job.id }, data: { reviewStatus: action === "approve" ? "APPROVED" : "ATTENTION", reviewNote: note.trim() || null, reviewedAt: new Date() } });
    return { bookingId: job.bookingId, feedback: note.trim() };
  });
  await notifyJobOwner(result.bookingId, action === "approve" ? "Customer approved the cleaning review" : "Customer says the cleaning needs attention", result.feedback);
}
