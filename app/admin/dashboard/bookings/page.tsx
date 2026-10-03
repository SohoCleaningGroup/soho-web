import Link from "next/link";
import { adminBookings } from "@/lib/admin/bookings";
import BookingSummary from "@/components/admin/bookings/BookingSummary";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string; before?: string }> }) {
  const params = await searchParams, archived = params.view === "archive", cursor = params.before ? new Date(params.before) : null;
  const bookings = await adminBookings({ status: { in: archived ? ["COMPLETED", "CANCELLED"] : ["PENDING", "CONFIRMED", "ASSIGNED"] }, ...(cursor && Number.isFinite(cursor.getTime()) ? { createdAt: { lt: cursor } } : {}) }, 26);
  return <section className="space-y-6"><h1 className="font-serif text-4xl">Bookings</h1><nav className="flex gap-4" aria-label="Booking views"><Link aria-current={!archived ? "page" : undefined} className={!archived ? "text-[#e3bd74] underline" : "text-[#cfc7b7]"} href="/admin/dashboard/bookings">Active bookings</Link><Link aria-current={archived ? "page" : undefined} className={archived ? "text-[#e3bd74] underline" : "text-[#cfc7b7]"} href="?view=archive">Archive</Link></nav><div className="grid gap-3">{bookings.slice(0,25).map(booking=><BookingSummary key={booking.id} booking={booking}/>)}{!bookings.length && <p className="text-[#cfc7b7]">No {archived ? "archived" : "active"} bookings.</p>}</div>{bookings.length>25 && <Link className="text-[#e3bd74] underline" href={`?view=${archived?'archive':'active'}&before=${encodeURIComponent(bookings[24].createdAt.toISOString())}`}>Older bookings →</Link>}</section>;
}
