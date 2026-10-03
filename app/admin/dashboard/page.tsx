import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { adminBookings } from "@/lib/admin/bookings";
import { timeclockEnabled } from "@/lib/timeclock/service";
import BookingSummary from "@/components/admin/bookings/BookingSummary";
export const dynamic = "force-dynamic";
export default async function AdminDashboardPage() {
  const tracking = timeclockEnabled();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  // Booking preferredDate is a date-only UTC value, not a service timestamp.
  const dayStart = new Date(`${today}T00:00:00Z`), dayEnd = new Date(dayStart.getTime() + 86400000);
  const [active, attention, recent, pendingApplications] = await Promise.all([
    adminBookings({ OR: [ ...(tracking ? [{ jobAssignment: { timecards: { some: { endedAt: null } } } }] : []), { status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] }, preferredDate: { gte: dayStart, lt: dayEnd } } ] }, 20, { preferredTime: "asc" }),
    adminBookings({ OR: [ { status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] }, OR: [{ jobAssignment: null }, { jobAssignment: { status: "DECLINED" } }] }, { jobAssignment: { reviewStatus: "ATTENTION" } }, ...(tracking ? [{ jobAssignment: { timecards: { some: { endedAt: { not: null }, status: "PENDING" } } } }] : []) ] }, 10),
    adminBookings({}, 5),
    prisma.professionalProfile.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
  ]);
  return <section className="space-y-8"><header><h1 className="font-serif text-4xl text-white">Overview</h1><p className="mt-2 text-[#cfc7b7]">Today’s jobs, next actions, and recent bookings.</p></header>
    <Panel title="Today & in progress" href="/admin/dashboard/bookings" link="All bookings"><Rows bookings={active} empty="No jobs scheduled for today and no cleaners currently clocked in." />{active.length===20 && <p className="mt-3 text-sm text-[#cfc7b7]">Showing up to 20 jobs. Open all bookings for the full list.</p>}</Panel>
    <Panel title="Needs your attention" href="/admin/dashboard/timecards" link="Time & location"><Rows bookings={attention} empty="No booking actions waiting right now." />{pendingApplications>0 && <Link className="mt-4 inline-block text-[#e3bd74] underline" href="/admin/dashboard/professionals">{pendingApplications} cleaner application(s) awaiting review →</Link>}{attention.length===10 && <p className="mt-3 text-sm text-[#cfc7b7]">Showing up to 10 bookings. Open bookings and time & location for all reviews.</p>}</Panel>
    <Panel title="Five most recent bookings" href="/admin/dashboard/bookings" link="View all"><Rows bookings={recent} empty="No bookings yet." /></Panel>
  </section>;
}
function Panel({ title, href, link, children }: { title: string; href: string; link: string; children: React.ReactNode }) { return <section><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl text-white">{title}</h2><Link href={href} className="text-sm text-[#e3bd74] underline">{link} →</Link></div>{children}</section>; }
function Rows({ bookings, empty }: { bookings: Awaited<ReturnType<typeof adminBookings>>; empty: string }) { return bookings.length ? <div className="grid gap-3">{bookings.map(booking=><BookingSummary key={booking.id} booking={booking}/>)}</div> : <p className="rounded-xl border border-[#352b1c] p-5 text-[#cfc7b7]">{empty}</p>; }
