import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasValidAdminSession } from "@/lib/security/admin-auth";

type CustomerBookingItem = {
  id: string;
  cleaningType: string;
  homeSize: string;
  preferredDate: Date | null;
  preferredTime: string | null;
  status: string;
  createdAt: Date;
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const { id } = await params;

  const customer = await prisma.userProfile.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Customer Details
        </p>

        <h1 className="font-serif text-5xl text-white">{customer.fullName}</h1>

        <p className="mt-4 text-[#cfc7b7]">
          View customer profile, contact details, address, and booking history.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="grid gap-6">
          <Panel title="Contact Details">
            <InfoGrid
              items={[
                ["Name", customer.fullName],
                ["Email", customer.email],
                ["Phone", customer.phone],
                ["Joined", customer.createdAt.toLocaleDateString("en-US")],
              ]}
            />
          </Panel>

          <Panel title="Address">
            <InfoGrid
              items={[
                ["Street Address", customer.address || "Not provided"],
                ["Apartment / Unit", customer.apartment || "Not provided"],
                ["City", customer.city || "Not provided"],
                ["State", customer.state || "Not provided"],
                ["Zip Code", customer.zipCode || "Not provided"],
              ]}
            />
          </Panel>
        </div>

        <Panel title="Booking History">
          {customer.bookings.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-[#3a2812] bg-[#111111] px-6 text-center">
              <p className="text-sm text-[#8f8778]">
                No bookings found for this customer.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {customer.bookings.map((booking: CustomerBookingItem) => (
                <Link
                  key={booking.id}
                  href={`/admin/dashboard/bookings/${booking.id}`}
                  className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5 transition hover:border-[#8f6b2f]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">
                        {formatLabel(booking.cleaningType)}
                      </p>

                      <p className="mt-1 text-xs text-[#8f8778]">
                        {booking.homeSize} ·{" "}
                        {booking.preferredDate
                          ? booking.preferredDate.toDateString()
                          : "No date"}{" "}
                        · {booking.preferredTime || "No time"}
                      </p>
                    </div>

                    <StatusBadge status={booking.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6">
      <h2 className="mb-6 font-serif text-3xl text-white">{title}</h2>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-4">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
            {label}
          </p>

          <p className="mt-2 text-sm leading-6 text-[#f3eadb]">
            {value || "Not provided"}
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-3 py-1 text-xs font-medium text-[#d6ab5f]">
      {formatLabel(status)}
    </span>
  );
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
