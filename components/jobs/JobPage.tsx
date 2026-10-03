import Image from "next/image";
import { notFound } from "next/navigation";
import { getJob, PHOTO_BUCKET } from "@/lib/jobs/service";
import { canUpload } from "@/lib/jobs/rules";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import JobControls from "./JobControls";
import TimeClock from "./TimeClock";
import { timeclockEnabled, workerTimecards } from "@/lib/timeclock/service";
export default async function JobPage({ token, review = false }: { token: string; review?: boolean }) {
  const job = await getJob(token, review);
  if (!job) notFound();
  const tracking = !review && timeclockEnabled() && job.status === "ACCEPTED";
  const cards = tracking ? await workerTimecards(job.id) : [];
  const closed = ["CANCELLED", "COMPLETED"].includes(job.booking.status);
  if (closed && (!tracking || !cards.length)) notFound();
  const images = await Promise.all(job.photos.map(async photo => {
    const { data } = await getSupabaseAdmin().storage.from(PHOTO_BUCKET).createSignedUrl(photo.path, 600);
    return data?.signedUrl || null;
  }));
  const address = job.status === "ACCEPTED" && !review ? [job.booking.userProfile.address, job.booking.userProfile.apartment, job.booking.userProfile.city].filter(Boolean).join(", ") : null;
  return <main className="min-h-screen w-full bg-[#0a0a0a] text-white"><div className="mx-auto max-w-3xl space-y-6 px-5 py-12">
    <p className="text-[#d6ab5f]">SoHo Cleaning Group</p><h1 className="text-3xl">{review ? "Review your cleaning" : "Your cleaning assignment"}</h1>
    <p>{job.booking.preferredDate?.toLocaleDateString("en-US", { timeZone: "America/New_York" })} · {job.booking.preferredTime}</p>
    <p>{job.booking.cleaningType.replaceAll("_", " ")} · {job.booking.homeSize.replace(/BHK/gi, "BR")}</p>
    {address && <><p>Address: {address}</p><p>Customer: {job.booking.userProfile.fullName} · {job.booking.userProfile.phone}</p>{job.booking.specialNotes && <p>Booking notes: {job.booking.specialNotes}</p>}</>}
    {!review && <p>Assignment: {job.status.toLowerCase()} · Customer review: {job.reviewStatus.toLowerCase()}</p>}
    {job.reviewNote && <p>Customer feedback: {job.reviewNote}</p>}
    {review && job.reviewStatus !== "AWAITING" && <p>Your response has been saved: {job.reviewStatus === "APPROVED" ? "Everything looks good" : "Needs attention"}. Contact SoHo if anything changes.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{images.map((src, i) => src && <a key={src} href={src} target="_blank" rel="noreferrer"><Image unoptimized src={src} width={900} height={900} className="h-auto w-full rounded-xl" alt={`Finished cleaning photo ${i + 1}`} /></a>)}</div>
    {tracking && <TimeClock token={token} activeId={cards.find(card => !card.endedAt)?.id} canStart={!closed && job.professional.status === "APPROVED"} />}
    {tracking && cards.length > 0 && <section className="space-y-2"><h2 className="text-xl">Recorded hours for this job</h2>{cards.map(card => <p key={card.id}>
      {card.startedAt.toLocaleString("en-US", { timeZone: "America/New_York" })} — {card.endedAt?.toLocaleString("en-US", { timeZone: "America/New_York" }) || "Still clocked in"}
      {card.endedAt ? ` · ${((card.endedAt.getTime() - card.startedAt.getTime()) / 3600000).toFixed(2)} hours` : ""} · {card.status.toLowerCase()}
    </p>)}<p className="text-sm text-gray-400">Times use New York time. Contact SoHo if your recorded hours need a correction.</p></section>}
    {!closed && <JobControls token={token} mode={review ? "customer" : "worker"} canRespond={review ? job.reviewStatus === "AWAITING" : job.status === "PENDING"} canAddPhotos={!review && canUpload(job.status, job.reviewStatus)} />}
    <p className="text-sm text-gray-400">Keep this private link to yourself. If it expires, ask SoHo for a new link.</p>
  </div></main>;
}
