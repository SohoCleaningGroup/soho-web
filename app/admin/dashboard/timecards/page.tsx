import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { timeclockEnabled } from "@/lib/timeclock/service";
import { locationAssessment, type LocationSnapshot } from "@/lib/timeclock/rules";
import TimecardReview from "@/components/admin/timecards/TimecardReview";
import JobLocation from "@/components/admin/timecards/JobLocation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Cleaner hours — SoHo", robots: { index: false, follow: false } };
const format = (date: Date) => date.toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short", hour12: true });
export default async function Page({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  if (!timeclockEnabled()) return <div><h1 className="text-3xl">Cleaner hours</h1><p className="mt-4">Time tracking is being prepared. No hours are being sent to Square.</p></div>;
  const { before } = await searchParams;
  const cursor = before ? new Date(before) : null;
  const cards = await prisma.cleanerTimecard.findMany({
    where: cursor && Number.isFinite(cursor.getTime()) ? { startedAt: { lt: cursor } } : {},
    take: 51, orderBy: { startedAt: "desc" },
    include: { professional: { select: { fullName: true } }, assignment: { include: { booking: { include: { userProfile: true } } } }, events: { orderBy: { createdAt: "asc" } } },
  });
  return <div className="space-y-6">
    <h1 className="text-3xl text-[#e3bd74]">Cleaner hours</h1>
    <p>Review actual hours and phone-reported clock locations. Times below use New York time. Square sync is not connected; approving hours does not run payroll.</p>
    {!cards.length && <p>No recorded hours yet.</p>}
    {cards.slice(0, 50).map(card => {
      const booking = card.assignment.booking;
      const address = [booking.userProfile.address, booking.userProfile.apartment, booking.userProfile.city, booking.userProfile.zipCode].filter(Boolean).join(", ");
      return <section key={card.id} className="space-y-4 rounded-xl border border-[#3d301b] bg-[#0a0a0a] p-5">
        <h2 className="text-xl">{card.professional.fullName} · {card.status.toLowerCase()}</h2>
        <Link href={`/admin/dashboard/bookings/${booking.id}`} className="text-[#e3bd74]">View job</Link>
        <p>Job address: {address || "Address unavailable"}</p>
        {address && <a className="text-[#e3bd74] underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`} target="_blank" rel="noreferrer">View job address in map</a>}
        <p>Start: {format(card.startedAt)} · End: {card.endedAt ? format(card.endedAt) : "Still clocked in"}</p>
        {card.endedAt && <p>Recorded hours: {((card.endedAt.getTime() - card.startedAt.getTime()) / 3600000).toFixed(2)} (no automatic break deductions)</p>}
        {card.approvalNote && <p>Approval note: {card.approvalNote}</p>}
        <div className="space-y-3">{card.events.filter(event => event.actor === "WORKER").map(event => {
          const detail = event.detail as { location?: LocationSnapshot };
          const location = detail.location;
          return <div key={event.id} className="rounded-lg border border-gray-700 p-3">
            <p>{event.kind === "CLOCK_IN" ? "Original clock-in" : "Original clock-out"}: {format(event.createdAt)}</p>
            {location && <p>{locationAssessment(location, card.assignment)}</p>}
            {location?.status === "captured" && <>
              <p>Phone location: {location.latitude}, {location.longitude} · Accuracy: ±{Math.round(location.accuracy!)} m</p>
              <a className="text-[#e3bd74] underline" href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">View clock location in map</a>
            </>}
          </div>;
        })}</div>
        <JobLocation assignmentId={card.assignmentId} latitude={card.assignment.siteLatitude} longitude={card.assignment.siteLongitude} radius={card.assignment.siteRadiusMeters} />
        <TimecardReview id={card.id} revision={card.revision} startedAt={card.startedAt.toISOString()} endedAt={card.endedAt?.toISOString() || null} approved={card.status === "APPROVED"} />
        <details><summary className="cursor-pointer">Review and correction history</summary><ul className="mt-3 space-y-2">{card.events.filter(event => event.actor === "ADMIN").map(event => {
          const detail = event.detail as { note?: string; before?: {start: string; end: string | null}; after?: {start: string; end: string} };
          return <li key={event.id}>{format(event.createdAt)} · {event.kind.toLowerCase()} · {detail.note}
            {detail.before && <p className="text-sm text-gray-400">Before: {detail.before.start} — {detail.before.end || "open"}<br />After: {detail.after?.start} — {detail.after?.end}</p>}
          </li>;
        })}</ul></details>
      </section>;
    })}
    {cards.length > 50 && <Link className="text-[#e3bd74]" href={`?before=${encodeURIComponent(cards[49].startedAt.toISOString())}`}>Older timecards</Link>}
  </div>;
}
