import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { services } from "@/data/services";

export const metadata: Metadata = {
  title: "Apartment Cleaning Services in Manhattan",
  description:
    "Compare standard, deep, move-in and move-out, and recurring apartment cleaning services from SoHo Cleaning Group's insured, in-house Manhattan team.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Apartment Cleaning Services in Manhattan",
    description:
      "Standard, deep, move-in and move-out, and recurring cleaning for Manhattan apartments and condos.",
    url: "/services",
    images: ["/images/og/home.png"],
  },
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[#050403] text-white">
      <header className="border-b border-[#3a2812] bg-[#070604]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="SoHo Cleaning Group home">
            <Image
              src="/images/soho-logo-n.png"
              alt="SoHo Cleaning Group"
              width={260}
              height={70}
              priority
              className="h-auto w-[170px] sm:w-[230px]"
            />
          </Link>
          <Link
            href="/onboarding/user"
            className="rounded-xl bg-[#d6ab5f] px-5 py-3 text-sm font-semibold text-black"
          >
            Book Now
          </Link>
        </div>
      </header>

      <section className="border-b border-[#3a2812] bg-[radial-gradient(circle_at_top,rgba(214,171,95,0.16),transparent_38%)] px-4 py-20 text-center sm:px-6 sm:py-24">
        <p className="text-xs uppercase tracking-[0.34em] text-[#d6ab5f]">
          Manhattan apartment cleaning
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl font-serif text-5xl leading-tight text-[#f7efe2] sm:text-7xl">
          Cleaning Services Built Around Your Home
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#d8cbbb]">
          From dependable upkeep to a detailed reset, choose the service that
          fits your apartment, schedule and next move.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((service) => (
            <article
              key={service.slug}
              className="group overflow-hidden border border-[#5b3d18] bg-[#0b0906]"
            >
              <div className="relative h-64">
                <Image
                  src={service.image}
                  alt={`${service.name} in Manhattan`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover opacity-80 transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050403] via-transparent to-transparent" />
              </div>
              <div className="p-7 sm:p-9">
                <p className="text-xs uppercase tracking-[0.28em] text-[#d6ab5f]">
                  {service.eyebrow}
                </p>
                <h2 className="mt-4 font-serif text-3xl text-[#f7efe2] sm:text-4xl">
                  {service.name}
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#d8cbbb]">
                  {service.summary}
                </p>
                <Link
                  href={`/services/${service.slug}`}
                  className="mt-7 inline-flex rounded-xl border border-[#a8792f] px-5 py-3 text-sm font-semibold text-[#e7c176] transition hover:bg-[#151008]"
                >
                  Explore {service.navLabel} →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
