import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import { hasValidAdminSession } from "@/lib/security/admin-auth";

type RecentBookingItem = {
  id: string;
  cleaningType: string;
  homeSize: string;
  status: string;
  userProfile: {
    fullName: string;
  };
};

type RecentProfessionalItem = {
  id: string;
  fullName: string;
  email: string;
  status: string;
};

export default async function AdminDashboardPage() {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    totalProfessionals,
    pendingProfessionals,
    approvedProfessionals,
    totalCustomers,
    recentBookings,
    recentProfessionals,
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "CONFIRMED" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.professionalProfile.count(),
    prisma.professionalProfile.count({ where: { status: "PENDING" } }),
    prisma.professionalProfile.count({ where: { status: "APPROVED" } }),
    prisma.userProfile.count({ where: { role: "USER" } }),
    prisma.booking.findMany({
      include: { userProfile: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.professionalProfile.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const pendingAssignments = await prisma.booking.count({
    where: {
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
  });

  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Overview
        </p>

        <h1 className="font-serif text-5xl text-white">Dashboard</h1>

        <p className="mt-4 text-[#cfc7b7]">
          Manage bookings, professional applications, customers, and operations.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          title="Total Bookings"
          value={String(totalBookings)}
          description={`${pendingBookings} pending · ${confirmedBookings} confirmed`}
        />

        <DashboardCard
          title="Completed Bookings"
          value={String(completedBookings)}
          description="Successfully completed cleaning jobs."
        />

        <DashboardCard
          title="Professionals"
          value={String(totalProfessionals)}
          description={`${pendingProfessionals} pending · ${approvedProfessionals} approved`}
        />

        <DashboardCard
          title="Customers"
          value={String(totalCustomers)}
          description="Customers who submitted bookings."
        />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <DashboardCard
          title="Pending Assignments"
          value={String(pendingAssignments)}
          description="Bookings waiting for assignment workflow."
        />

        <DashboardCard
          title="Pending Professionals"
          value={String(pendingProfessionals)}
          description="Professional applications awaiting review."
        />
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <Panel title="Recent Bookings">
          {recentBookings.length === 0 ? (
            <EmptyState text="No bookings available yet." />
          ) : (
            <div className="grid gap-3">
              {recentBookings.map((booking: RecentBookingItem) => (
                <a
                  key={booking.id}
                  href={`/admin/dashboard/bookings/${booking.id}`}
                  className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5 transition hover:border-[#8f6b2f]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {booking.userProfile.fullName}
                      </p>
                      <p className="mt-1 text-xs text-[#8f8778]">
                        {formatLabel(booking.cleaningType)} · {booking.homeSize}
                      </p>
                    </div>

                    <StatusBadge status={booking.status} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Recent Professional Applications">
          {recentProfessionals.length === 0 ? (
            <EmptyState text="No professional applications available yet." />
          ) : (
            <div className="grid gap-3">
              {recentProfessionals.map((professional: RecentProfessionalItem) => (
                <a
                  key={professional.id}
                  href={`/admin/dashboard/professionals/${professional.id}`}
                  className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5 transition hover:border-[#8f6b2f]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {professional.fullName}
                      </p>
                      <p className="mt-1 text-xs text-[#8f8778]">
                        {professional.email}
                      </p>
                    </div>

                    <StatusBadge status={professional.status} />
                  </div>
                </a>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-[#8f8778]">
        {title}
      </p>

      <h2 className="mt-5 font-serif text-5xl text-[#d6ab5f]">{value}</h2>

      <p className="mt-4 text-sm leading-7 text-[#cfc7b7]">{description}</p>
    </div>
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-3 py-1 text-xs font-medium text-[#d6ab5f]">
      {formatLabel(status)}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-[24px] border border-dashed border-[#3a2812] bg-[#111111] px-6 text-center">
      <p className="max-w-xs text-sm leading-7 text-[#8f8778]">{text}</p>
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
