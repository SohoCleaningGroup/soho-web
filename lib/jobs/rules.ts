import { createHash, randomBytes } from "node:crypto";
export const JOB_LINK_SECONDS = 14 * 24 * 60 * 60;
export function newJobToken() { return randomBytes(32).toString("base64url"); }
export function tokenHash(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Invalid or expired job link.");
  return createHash("sha256").update(token).digest("hex");
}
export function requireOpenJob(status: string) {
  if (status === "CANCELLED" || status === "COMPLETED") throw new Error("This booking is closed.");
}
export function requireReviewApproval(job: {reviewStatus: string} | null) {
  if (job && job.reviewStatus !== "APPROVED") throw new Error("Wait for the customer to approve the cleaning review before completing or capturing payment.");
}
export function canUpload(status: string, reviewStatus: string) {
  return status === "ACCEPTED" && (reviewStatus === "NONE" || reviewStatus === "ATTENTION");
}
