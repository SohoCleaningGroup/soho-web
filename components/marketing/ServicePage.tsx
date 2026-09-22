import Image from "next/image";
import Link from "next/link";

import type { Service } from "@/data/services";
import {
  EMAIL,
  PHONE_HREF,
  PHONE_NUMBER,
  SITE_NAME,
  SITE_URL,
  localBusinessJsonLd,
} from "@/lib/site";

export default function ServicePage({ service }: { service: Service }) {
  const serviceUrl = `${SITE_URL}/services/${service.slug}`;
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.metaDescription,
    url: serviceUrl,
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Manhattan, New York",
    },
    provider: {
      "@id": `${SITE_URL}/#business`,
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <main className="min-h-screen bg-[#050403] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([localBusinessJsonLd, serviceJsonLd]).replace(
            /</g,
            "\\u003c"
          ),
        }}
      />

      <header className="border-b border-[#3a2812] bg-[#070604]/95">
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

          <div className="flex items-center gap-3">
            <Link
              href="/services"
              className="hidden text-sm text-[#e7dece] transition hover:text-[#e7c176] sm:block"
            >
              All Services
            </Link>
            <Link
              href="/onboarding/user"
              className="rounded-xl bg-[#d6ab5f] px-4 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] sm:px-6"
            >
              Book Now
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#3a2812]">
        <div className="absolute inset-0">
          <Image
            src={service.image}
            alt={`${service.name} in a Manhattan apartment`}
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,0.99)_0%,rgba(5,4,3,0.88)_50%,rgba(5,4,3,0.55)_100%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-[#c4b8a7]">
            <Link href="/" className="hover:text-[#e7c176]">
              Home
            </Link>
            <span className="px-3 text-[#6d4a1f]">/</span>
            <Link href="/services" className="hover:text-[#e7c176]">
              Services
            </Link>
            <span className="px-3 text-[#6d4a1f]">/</span>
            <span className="text-[#e7c176]">{service.navLabel}</span>
          </nav>

          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[#d6ab5f] sm:tracking-[0.34em]">
              {service.eyebrow}
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-[1.02] text-[#f7efe2] sm:text-7xl">
              {service.name}
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#eadcca]">
              {service.intro}
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/onboarding/user"
                className="rounded-xl bg-[#d6ab5f] px-7 py-4 text-center font-semibold text-black transition hover:scale-[1.02]"
              >
                Book Your Cleaning
              </Link>
              <a
                href={PHONE_HREF}
                className="rounded-xl border border-[#a8792f] px-7 py-4 text-center font-medium text-[#e7c176] transition hover:bg-[#151008]"
              >
                Call {PHONE_NUMBER}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#3a2812] bg-[#080705]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#d6ab5f]">
              What&apos;s included
            </p>
            <h2 className="mt-4 font-serif text-4xl text-[#f7efe2] sm:text-5xl">
              Thoughtful care in every room
            </h2>
            <ul className="mt-8 grid gap-4">
              {service.included.map((item) => (
                <li
                  key={item}
                  className="flex gap-4 border-b border-[#2f291d] pb-4 text-sm leading-7 text-[#d8cbbb]"
                >
                  <span className="text-[#d6ab5f]" aria-hidden="true">
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <aside className="border border-[#5b3d18] bg-[#0b0906] p-7 sm:p-9">
            <p className="text-xs uppercase tracking-[0.32em] text-[#d6ab5f]">
              Best for
            </p>
            <h2 className="mt-4 font-serif text-3xl text-[#f7efe2]">
              Is this service right for you?
            </h2>
            <ul className="mt-7 space-y-5">
              {service.bestFor.map((item) => (
                <li key={item} className="flex gap-4 text-sm leading-7 text-[#eadcca]">
                  <span
                    className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#8f6b2f] text-xs text-[#d6ab5f]"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 border-t border-[#3a2812] pt-6 text-sm leading-7 text-[#bdb2a2]">
              Not sure which service fits? Call us and we&apos;ll help you choose
              before booking.
            </p>
          </aside>
        </div>
      </section>

      <section className="border-b border-[#3a2812] bg-[#050403]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <p className="text-center text-xs uppercase tracking-[0.32em] text-[#d6ab5f]">
            Why SoHo Cleaning Group
          </p>
          <h2 className="mt-4 text-center font-serif text-4xl text-[#f7efe2] sm:text-5xl">
            Trust built into the service
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {service.highlights.map((item) => (
              <article
                key={item.title}
                className="border border-[#3a2812] bg-[#0b0906] p-7"
              >
                <h3 className="font-serif text-2xl text-[#f7efe2]">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-[#d8cbbb]">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 border border-[#a8792f] bg-[#090806] px-7 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-serif text-3xl text-[#f7efe2] sm:text-4xl">
              Ready for a cleaner Manhattan home?
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d8cbbb]">
              Choose your service, tell us about your home and reserve your
              preferred time through our secure booking flow.
            </p>
          </div>
          <Link
            href="/onboarding/user"
            className="rounded-xl bg-[#d6ab5f] px-7 py-4 text-center font-semibold text-black transition hover:scale-[1.02]"
          >
            Start Booking
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#3a2812] bg-black px-4 py-8 text-sm text-[#bdb2a2] sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SoHo Cleaning Group. Serving Manhattan.</p>
          <div className="flex flex-wrap gap-5">
            <a href={PHONE_HREF} className="hover:text-[#e7c176]">
              {PHONE_NUMBER}
            </a>
            <a href={`mailto:${EMAIL}`} className="hover:text-[#e7c176]">
              {EMAIL}
            </a>
            <Link href="/privacy-policy" className="hover:text-[#e7c176]">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
