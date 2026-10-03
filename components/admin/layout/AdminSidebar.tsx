"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Bookings", href: "/admin/dashboard/bookings" },
  { label: "Cleaners", href: "/admin/dashboard/professionals" },
  { label: "Availability", href: "/admin/dashboard/availability" },
  { label: "Time & location", href: "/admin/dashboard/timecards" },
  { label: "Payments", href: "/admin/dashboard/payments" },
  { label: "Referrals", href: "/admin/dashboard/referrals" },
  { label: "Customers", href: "/admin/dashboard/customers" },
];

export default function AdminSidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-[#2a2419] bg-[#080706] p-6 lg:block">
        <SidebarContent />
      </aside>

      <header className="sticky top-0 z-40 border-b border-[#2a2419] bg-[#080706]/90 px-4 py-4 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Image
            src="/images/soho-logo-new.png"
            alt="SoHo Cleaning Group"
            width={150}
            height={60}
            className="h-auto"
          />

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="rounded-xl border border-[#8f6b2f] px-4 py-2 text-sm text-[#e3bd74]"
          >
            Menu
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/70"
            aria-label="Close menu"
          />

          <aside className="relative z-10 h-full w-80 max-w-[85vw] border-r border-[#2a2419] bg-[#080706] p-6">
            <div className="mb-8 flex items-center justify-between">
              <Image
                src="/images/soho-logo-new.png"
                alt="SoHo Cleaning Group"
                width={160}
                height={60}
                className="h-auto"
              />

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8f6b2f] text-[#e3bd74]"
              >
                ✕
              </button>
            </div>

            <SidebarContent onNavigate={() => setIsOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <div className="mb-10 hidden lg:block">
        <Image
          src="/images/soho-logo-new.png"
          alt="SoHo Cleaning Group"
          width={180}
          height={70}
          priority
          className="h-auto"
        />

        <p className="mt-3 text-[11px] uppercase tracking-[0.28em] text-[#a98a51]">
          Admin Panel
        </p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={(item.href === "/admin/dashboard" ? pathname === item.href : pathname.startsWith(item.href)) ? "page" : undefined}
            onClick={onNavigate}
            className="block rounded-2xl px-4 py-3 text-sm text-[#d8d0c1] transition hover:bg-[#151008] hover:text-[#e3bd74] aria-[current=page]:bg-[#2d2417] aria-[current=page]:text-[#e3bd74]"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action="/api/admin/logout" method="POST" className="mt-8 lg:absolute lg:bottom-6 lg:left-6 lg:right-6">
        <button
          type="submit"
          className="w-full rounded-2xl border border-[#8f6b2f] px-5 py-3 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
        >
          Logout
        </button>
      </form>
    </>
  );
}