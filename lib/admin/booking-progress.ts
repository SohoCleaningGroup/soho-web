import type { LocationSnapshot } from "@/lib/timeclock/rules";
import { locationAssessment } from "@/lib/timeclock/rules";
type Job = { status: string; reviewStatus: string; professional?: { fullName: string }; siteLatitude: number | null; siteLongitude: number | null; siteRadiusMeters: number; timecards?: { endedAt: Date | null; status: string; events?: { actor: string; detail: unknown }[] }[] };
export function bookingProgress(booking: { status: string; jobAssignment: Job | null }) {
  const job = booking.jobAssignment;
  if (booking.status === "CANCELLED") return { label: "Cancelled", next: "Review booking history", target: "details" };
  if (booking.status === "COMPLETED") return { label: "Completed", next: "Review payment and hours", target: "payment" };
  if (!job || job.status === "DECLINED") return { label: "Needs cleaner", next: "Assign cleaner", target: "assignment" };
  const active = job.timecards?.some(card => !card.endedAt);
  if (active) return { label: "In progress", next: "View recorded work time", target: "time" };
  if (job.reviewStatus === "ATTENTION") return { label: "Customer needs attention", next: "Review feedback", target: "assignment" };
  if (job.reviewStatus === "AWAITING") return { label: "Awaiting customer review", next: "Review completion photos", target: "photos" };
  if (job.reviewStatus === "APPROVED") return { label: "Customer approved", next: "Review completion and payment", target: "payment" };
  if (job.status === "PENDING") return { label: "Invitation pending", next: "Review assignment", target: "assignment" };
  if (job.timecards?.some(card => card.endedAt)) return { label: "Clocked out", next: "Review hours and completion", target: "time" };
  return { label: "Cleaner accepted", next: "View assignment", target: "assignment" };
}
export function bookingAlerts(booking: { status: string; jobAssignment: Job | null }) {
  const job = booking.jobAssignment; const alerts: string[] = [];
  if (!["CANCELLED", "COMPLETED"].includes(booking.status) && (!job || job.status === "DECLINED")) alerts.push("Needs cleaner");
  if (job?.reviewStatus === "ATTENTION") alerts.push("Customer feedback needs attention");
  if (job?.timecards?.some(card => card.endedAt && card.status !== "APPROVED")) alerts.push("Hours awaiting review");
  if (job?.timecards?.some(card => card.events?.some(event => {
    const location = (event.detail as { location?: LocationSnapshot }).location;
    if (event.actor !== "WORKER" || !location) return false;
    return locationAssessment(location, job) !== "Within job area (phone reported)";
  }))) alerts.push("Clock location needs review");
  return alerts;
}
