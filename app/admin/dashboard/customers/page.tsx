import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

import { hasValidAdminSession } from "@/lib/security/admin-auth";

type CustomerItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  createdAt: Date;
  bookings: {
    id: string;
    status: string;
  }[];
};

export default async function AdminCustomersPage() {
  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const customers = await prisma.userProfile.findMany({
    where: {
      role: "USER",
    },
    include: {
      bookings: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Customers
        </p>

        <h1 className="font-serif text-5xl text-white">Customers</h1>

        <p className="mt-4 text-[#cfc7b7]">
          View all customers who submitted cleaning booking requests.
        </p>
      </div>

      {customers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#2a2419] bg-[#0a0a0a]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-[#2a2419] bg-[#111111]">
                <tr>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Action</TableHead>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer: CustomerItem) => (
                  <tr
                    key={customer.id}
                    className="border-b border-[#2a2419] last:border-b-0"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-white">
                          {customer.fullName}
                        </p>
                        <p className="mt-1 text-xs text-[#8f8778]">
                          {customer.email}
                        </p>
                        <p className="mt-1 text-xs text-[#8f8778]">
                          {customer.phone}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      {[customer.city, customer.state, customer.zipCode]
                        .filter(Boolean)
                        .join(", ") || "Not provided"}
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-3 py-1 text-xs font-medium text-[#d6ab5f]">
                        {customer.bookings.length} booking
                        {customer.bookings.length === 1 ? "" : "s"}
                      </span>
                    </TableCell>

                    <TableCell>
                      {customer.createdAt.toLocaleDateString("en-US")}
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/admin/dashboard/customers/${customer.id}`}
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

function EmptyState() {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-[#3a2812] bg-[#0a0a0a] px-6 text-center">
      <p className="text-sm text-[#8f8778]">No customers available yet.</p>
    </div>
  );
}
