import { formatTimeRange } from "@/lib/time-format";
import Link from "next/link";
import { bookingProgress, bookingAlerts } from "@/lib/admin/booking-progress";
import type { adminBookings } from "@/lib/admin/bookings";
type Booking = Awaited<ReturnType<typeof adminBookings>>[number];
export default function BookingSummary({ booking }: { booking: Booking }) {
  const progress = bookingProgress(booking), alerts = bookingAlerts(booking);
  return <Link href={`/admin/dashboard/bookings/${booking.id}`} className="block rounded-xl border border-[#352b1c] bg-[#111111] p-4 transition hover:border-[#d6ab5f] focus-visible:outline-2 focus-visible:outline-[#d6ab5f]">
    <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]"><div><p className="font-medium text-white">{booking.userProfile.fullName}</p><p className="mt-1 text-sm text-[#cfc7b7]">{booking.homeSize.replace(/BHK/gi, "BR")} · {booking.preferredDate?.toLocaleDateString("en-US", { timeZone: "UTC" }) || "Date needed"} · {formatTimeRange(booking.preferredTime) || "Time needed"}</p><p className="mt-1 text-xs text-[#b6ad9d]">Booking {booking.id.slice(-8)}</p></div><div><p className="text-sm text-[#e3bd74]">{progress.label}</p><p className="mt-1 text-sm text-[#cfc7b7]">{progress.next} →</p></div><div><p className="text-sm text-white">{booking.jobAssignment?.professional.fullName || "Unassigned"}</p>{alerts.map(alert => <p key={alert} className="mt-1 text-xs text-amber-200">{alert}</p>)}</div></div>
  </Link>;
}
