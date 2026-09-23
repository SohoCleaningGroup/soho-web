import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

import { hasValidAdminSession } from "@/lib/security/admin-auth";
type BookingItem = {
  id: string;
  cleaningType: string;
  homeSize: string;
  bedrooms: number | null;
  bathrooms: number | null;
  kitchens: number | null;
  preferredDate: Date | null;
  preferredTime: string | null;
  status: string;
  createdAt: Date;
  userProfile: {
    fullName: string;
    email: string;
    phone: string;
  };
};

export default async function AdminBookingsPage() {
    if (!(await hasValidAdminSession())) {
        redirect("/admin/login");
    }

    const bookings = await prisma.booking.findMany({
        include: {
            userProfile: true,
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return (
        <section>
            <div className="mb-10">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
                    Bookings
                </p>

                <h1 className="font-serif text-5xl text-white">Customer Bookings</h1>

                <p className="mt-4 text-[#cfc7b7]">
                    View all cleaning booking requests submitted by customers.
                </p>
            </div>

            {bookings.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="overflow-hidden rounded-[28px] border border-[#2a2419] bg-[#0a0a0a]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1000px] text-left">
                            <thead className="border-b border-[#2a2419] bg-[#111111]">
                                <tr>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Service</TableHead>
                                    <TableHead>Home</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Action</TableHead>
                                </tr>
                            </thead>

                            <tbody>
                                {bookings.map((booking: BookingItem) => (
                                    <tr
                                        key={booking.id}
                                        className="border-b border-[#2a2419] last:border-b-0"
                                    >
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-white">
                                                    {booking.userProfile.fullName}
                                                </p>
                                                <p className="mt-1 text-xs text-[#8f8778]">
                                                    {booking.userProfile.email}
                                                </p>
                                                <p className="mt-1 text-xs text-[#8f8778]">
                                                    {booking.userProfile.phone}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell>{formatLabel(booking.cleaningType)}</TableCell>

                                        <TableCell>
                                            <div className="text-sm text-[#d8d0c1]">
                                                <p>{booking.homeSize}</p>
                                                <p className="mt-1 text-xs text-[#8f8778]">
                                                    {booking.bedrooms ?? 0} Bed ·{" "}
                                                    {booking.bathrooms ?? 0} Bath ·{" "}
                                                    {booking.kitchens ?? 0} Kitchen
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-sm text-[#d8d0c1]">
                                                <p>
                                                    {booking.preferredDate
                                                        ? booking.preferredDate.toDateString()
                                                        : "No date"}
                                                </p>
                                                <p className="mt-1 text-xs text-[#8f8778]">
                                                    {booking.preferredTime || "No time selected"}
                                                </p>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge status={booking.status} />
                                        </TableCell>

                                        <TableCell>
                                            {booking.createdAt.toLocaleDateString("en-US")}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/dashboard/bookings/${booking.id}`}
                                                className="inline-flex rounded-xl border border-[#8f6b2f] px-4 py-2 text-xs font-medium text-[#e3bd74] transition hover:bg-[#151008]"
                                            >
                                                View
                                            </Link>
                                        </TableCell>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}

function TableHead({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-6 py-4 text-xs font-medium uppercase tracking-[0.2em] text-[#8f8778]">
            {children}
        </th>
    );
}

function TableCell({ children }: { children: React.ReactNode }) {
    return <td className="px-6 py-5 text-sm text-[#d8d0c1]">{children}</td>;
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-3 py-1 text-xs font-medium text-[#d6ab5f]">
            {formatLabel(status)}
        </span>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-[#3a2812] bg-[#0a0a0a] px-6 text-center">
            <p className="text-sm text-[#8f8778]">No bookings available yet.</p>
        </div>
    );
}

function formatLabel(value: string) {
    return value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
