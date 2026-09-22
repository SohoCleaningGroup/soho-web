import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { localBusinessJsonLd, GOOGLE_REVIEW_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Manhattan Apartment Cleaning",

  description:
    "Insured, bonded, in-house Manhattan apartment cleaners serving SoHo, NoHo, the East Village and West Village. Book standard, deep, move-in/out or recurring cleaning.",

  keywords: [
    "Manhattan cleaning service",
    "NYC apartment cleaning",
    "luxury home cleaning Manhattan",
    "professional cleaners New York",
    "SoHo Cleaning Group",
    "deep cleaning Manhattan",
    "move in move out cleaning NYC",
    "recurring home cleaning",
  ],

  openGraph: {
    title:
      "Premium Home Cleaning Services in Manhattan | SoHo Cleaning Group",

    description:
      "Luxury-level cleaning delivered by trusted professionals. Book your Manhattan home cleaning experience online with confidence.",

    url: "https://sohocleaninggroup.com",

    siteName: "SoHo Cleaning Group",

    images: [
      {
        url: "/images/og/home.png",
        width: 1200,
        height: 630,
        alt: "SoHo Cleaning Group Premium Manhattan Cleaning Service",
      },
    ],

    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",

    title:
      "SoHo Cleaning Group | Premium Manhattan Cleaning",

    description:
      "Professional home cleaning built around trust, quality, and premium service standards.",

    images: ["/images/og/home.png"],
  },
  alternates: {
    canonical: "/",
  },
};

const phoneNumber = "+1 (646) 530-0590";
const phoneHref = "tel:+16465300590";
const email = "info@sohocleaninggroup.com";

const services = [
  {
    title: "SoHo Signature Cleaning",
    description:
      "Perfect for regular upkeep and keeping your home spotless week after week.",
    image: "/images/home/service-standard.jpg",
    icon: "⌂",
    href: "/services/standard-cleaning",
  },
  {
    title: "SoHo Signature Deep Cleaning",
    description:
      "A detailed, top-to-bottom clean for a fresher, healthier living space.",
    image: "/images/home/service-deep.jpg",
    icon: "✦",
    href: "/services/deep-cleaning",
  },
  {
    title: "Move In / Move Out",
    description:
      "We make moving easier with spotless spaces you can feel good about.",
    image: "/images/home/service-move.jpg",
    icon: "□",
    href: "/services/move-in-move-out-cleaning",
  },
  {
    title: "Recurring Service",
    description:
      "Weekly, bi-weekly, or monthly cleaning tailored to your lifestyle.",
    image: "/images/home/service-recurring.jpg",
    icon: "▣",
    href: "/services/recurring-cleaning",
  },
];

const neighborhoods = [
  "SoHo",
  "Tribeca",
  "Chelsea",
  "Upper East Side",
  "West Village",
  "Midtown",
];

const features = [
  {
    title: "Trusted Professionals",
    description: "Vetted, background-checked cleaners you can trust.",
    icon: "👥",
  },
  {
    title: "White-Glove Care",
    description: "We treat your home with the highest level of care.",
    icon: "🧤",
  },
  {
    title: "Eco-Friendly Products",
    description: "Safe, non-toxic products for your family and pets.",
    icon: "🌿",
  },
  {
    title: "Always On Time",
    description: "Reliable scheduling and punctual arrivals.",
    icon: "⏱",
  },
];

const steps = [
  {
    title: "Choose Your Service",
    description: "Select the cleaning type, home size, and preferred schedule.",
  },
  {
    title: "Confirm & Pay Securely",
    description: "Review your booking and complete secure payment online.",
  },
  {
    title: "Enjoy A Pristine Space",
    description: "A trusted SoHo professional arrives and handles the cleaning.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#050403] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <TopBar />
      <Header />
      <HeroSection />
      <Neighborhoods />
      <ServicesSection />
      <BeforeAfterSection />
      <WhyChooseSection />
      <BottomInfoSection />
      <BookingCTASection />
      <Footer />
      <MobileCTA />
    </main>
  );
}

function TopBar() {
  return (
    <div className="border-b border-[#3a2812] bg-[#050403] text-[#d6ab5f]">
      <div className="mx-auto flex max-w-7xl items-center justify-center px-4 py-2 text-center text-[10px] sm:justify-between sm:px-6 sm:text-xs lg:px-8">
        <p className="uppercase tracking-[0.18em] sm:tracking-[0.28em]">
          ★ Your Trusted NYC Cleaning Experts
        </p>

        <a
          href={phoneHref}
          className="hidden font-medium transition hover:text-white sm:block"
        >
          Call Us: {phoneNumber}
        </a>
      </div>
    </div>
  );
}

function Header() {
  const links = [
    { label: "Home", href: "#home" },
    { label: "Services", href: "#services" },
    { label: "About", href: "#about" },
    { label: "Our Story", href: "/our-story" },
    { label: "Reviews", href: "#reviews" },
    { label: "Book", href: "/onboarding/user" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#3a2812] bg-[#070604]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
        <Link href="#home" className="flex shrink-0 items-center">
          <Image
            src="/images/soho-logo-n.png"
            alt="SoHo Cleaning Group"
            width={260}
            height={70}
            priority
            className="h-auto w-[150px] sm:w-[210px] lg:w-[260px]"
          />
        </Link>

        <nav className="hidden items-center gap-9 text-sm text-[#e7dece] lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition hover:text-[#e7c176]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={phoneHref}
            className="rounded-xl border border-[#8f6b2f] px-5 py-3 text-sm font-medium text-[#e7c176] transition hover:bg-[#151008]"
          >
            Call Us
          </a>

          <Link
            href="/onboarding/user"
            className="rounded-xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_24px_rgba(214,171,95,0.22)] transition hover:scale-[1.02]"
          >
            Book Your Cleaning
          </Link>
        </div>

        <Link
          href="/onboarding/user"
          className="rounded-xl bg-[#d6ab5f] px-4 py-2 text-xs font-semibold text-black md:hidden"
        >
          Book
        </Link>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-[#3a2812]"
    >
      <div className="absolute inset-0">
        <Image
          src="/images/home/hero-van-n.jpg"
          alt="SoHo Cleaning Group premium branded van in NYC"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_center] opacity-70 sm:object-center sm:opacity-75"
        />

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,0.98)_0%,rgba(5,4,3,0.86)_45%,rgba(5,4,3,0.45)_100%)] sm:bg-[linear-gradient(90deg,rgba(5,4,3,0.96)_0%,rgba(5,4,3,0.76)_36%,rgba(5,4,3,0.35)_70%,rgba(5,4,3,0.75)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_left,rgba(214,171,95,0.16),transparent_42%)]" />
      </div>

      <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center px-4 py-14 sm:min-h-[660px] sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <p className="mb-5 max-w-sm text-xs font-medium uppercase tracking-[0.22em] text-[#d6ab5f] sm:max-w-none sm:tracking-[0.34em]">
            Premium Cleaning for Manhattan Homes & Apartments
          </p>

          <h1 className="font-serif text-[46px] leading-[0.98] text-[#f7efe2] sm:text-7xl lg:text-8xl">
            Pristine Spaces.
            <span className="block text-[#d6ab5f]">Premium Care.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-[#eee2d2] sm:mt-7 sm:text-lg sm:leading-8">
            Experience top-notch cleaning with trusted professionals,
            eco-friendly products, and white-glove care.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/onboarding/user"
              className="rounded-xl bg-[#d6ab5f] px-5 py-4 text-center text-sm font-semibold text-black shadow-[0_0_30px_rgba(214,171,95,0.26)] transition hover:scale-[1.02] sm:px-7 sm:text-base"
            >
              Book Your Cleaning
            </Link>

            <a
              href={phoneHref}
              className="rounded-xl border border-[#a8792f] bg-black/20 px-5 py-4 text-center text-sm font-medium text-[#e7c176] transition hover:bg-[#151008] sm:px-7 sm:text-base"
            >
              Call Us
            </a>
          </div>

          <div className="mt-9 grid max-w-2xl grid-cols-2 gap-4 sm:mt-10 sm:grid-cols-4">
            {[
              ["Trusted", "Professionals"],
              ["Eco-Friendly", "Products"],
              ["Insured &", "Bonded"],
              ["Satisfaction", "Guaranteed"],
            ].map(([top, bottom]) => (
              <div
                key={top}
                className="px-2 text-center sm:border-l sm:border-[#6d4a1f] sm:px-4 sm:first:border-l-0"
              >
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[#a8792f] text-sm text-[#d6ab5f] sm:h-12 sm:w-12">
                  ✓
                </div>

                <p className="text-xs leading-5 text-[#f4eadb] sm:text-sm">
                  {top}
                  <br />
                  {bottom}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Neighborhoods() {
  return (
    <section className="border-b border-[#3a2812] bg-[#080705]">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <p className="mb-5 text-center text-[10px] uppercase tracking-[0.26em] text-[#d6ab5f] sm:text-xs sm:tracking-[0.36em]">
          Proudly Serving NYC Neighborhoods
        </p>

        <div className="grid grid-cols-2 gap-4 text-center text-xs uppercase tracking-[0.18em] text-[#f0e2cf] sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-10 sm:gap-y-4 sm:text-sm sm:tracking-[0.22em]">
          {neighborhoods.map((item, index) => (
            <span key={item} className="block sm:flex sm:items-center sm:gap-10">
              {item}
              {index < neighborhoods.length - 1 && (
                <span className="hidden h-5 w-px bg-[#6d4a1f] md:inline-block" />
              )}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section id="services" className="border-b border-[#3a2812] bg-[#050403]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.32fr_1fr] lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-[#d6ab5f]">
            What We Offer
          </p>

          <h2 className="mt-4 font-serif text-4xl leading-tight text-[#f7efe2] sm:text-5xl lg:text-4xl">
            Our Premium Cleaning Services
          </h2>

          <p className="mt-5 text-sm leading-7 text-[#d8cbbb]">
            Tailored cleaning solutions designed for the way you live.
          </p>

          <Link
            href="/services"
            className="mt-8 inline-flex rounded-xl border border-[#8f6b2f] px-6 py-3 text-sm font-medium text-[#e7c176] transition hover:bg-[#151008]"
          >
            View All Services
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              className="group overflow-hidden rounded-sm border border-[#5b3d18] bg-[#0b0906] transition hover:-translate-y-1 hover:border-[#d6ab5f]"
            >
              <div className="relative h-56 sm:h-48">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover opacity-85 transition group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#050403] via-transparent to-transparent" />

                <div className="absolute -bottom-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-[#d6ab5f] bg-[#080705] font-serif text-2xl text-[#d6ab5f]">
                  {service.icon}
                </div>
              </div>

              <div className="px-5 pb-7 pt-10 text-center">
                <h3 className="font-serif text-2xl text-[#f7efe2]">
                  {service.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#d8cbbb]">
                  {service.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="border-b border-[#3a2812] bg-[#050403]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="grid overflow-hidden border border-[#5b3d18] md:grid-cols-2">
          <BeforeAfterImage
            label="Before"
            image="/images/home/before-cleaning.jpg"
            grayscale
          />

          <BeforeAfterImage
            label="After"
            image="/images/home/after-cleaning.jpg"
          />
        </div>

        <div className="relative min-h-[360px] overflow-hidden border border-[#3a2812] bg-[#090806] p-8 sm:p-10 lg:min-h-0">
          <Image
            src="/images/home/luxury-room-dark.jpg"
            alt="Luxury clean living room"
            fill
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-cover opacity-35"
          />

          <div className="relative z-10 max-w-md">
            <p className="text-xs uppercase tracking-[0.3em] text-[#d6ab5f]">
              Real Results
            </p>

            <h2 className="mt-4 font-serif text-4xl text-[#f7efe2] sm:text-5xl lg:text-4xl">
              See The Difference
            </h2>

            <p className="mt-5 text-base leading-8 text-[#eadcca]">
              Attention to detail that transforms your space and elevates
              everyday living.
            </p>

            <Link
              href="/onboarding/user"
              className="mt-8 inline-flex rounded-xl border border-[#8f6b2f] px-6 py-3 text-sm font-medium text-[#e7c176] transition hover:bg-[#151008]"
            >
              Book Yours Today
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function BeforeAfterImage({
  label,
  image,
  grayscale = false,
}: {
  label: string;
  image: string;
  grayscale?: boolean;
}) {
  return (
    <div className="relative min-h-[260px] sm:min-h-[290px]">
      <Image
        src={image}
        alt={`${label} cleaning result`}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className={`object-cover ${grayscale ? "grayscale" : ""}`}
      />

      <span className="absolute left-4 top-4 border border-[#a8792f] bg-[#050403]/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#e7c176]">
        {label}
      </span>
    </div>
  );
}

function WhyChooseSection() {
  return (
    <section
      id="about"
      className="relative border-b border-[#3a2812] bg-[#080705] py-12 sm:py-16"
    >
      <Image
        src="/images/home/luxury-room-dark.jpg"
        alt="Premium room background"
        fill
        sizes="100vw"
        className="object-cover opacity-18"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#050403] via-[#050403]/90 to-[#050403]/55" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-[0.34em] text-[#d6ab5f]">
          Why Choose SoHo Cleaning Group
        </p>

        <h2 className="mt-4 font-serif text-4xl text-[#f7efe2] sm:text-5xl">
          Premium Care, Every Visit
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-t border-[#6d4a1f] px-6 pt-6 text-center md:border-l md:border-t-0 md:pt-0"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#a8792f] bg-[#0b0906] text-3xl text-[#e7c176]">
                {feature.icon}
              </div>

              <h3 className="mt-5 font-serif text-xl text-[#f7efe2]">
                {feature.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[#d8cbbb]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomInfoSection() {
  return (
    <section id="reviews" className="border-b border-[#3a2812] bg-[#050403]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.34em] text-[#d6ab5f]">
            Simple & Secure
          </p>

          <h2 className="mt-4 font-serif text-4xl text-[#f7efe2] sm:text-5xl">
            How It Works
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#a8792f] font-serif text-2xl text-[#e7c176]">
                  {index + 1}
                </div>

                <h3 className="font-serif text-xl text-[#f7efe2]">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#d8cbbb]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[#3a2812] pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <p className="text-xs uppercase tracking-[0.34em] text-[#d6ab5f]">
            What Our Clients Say
          </p>

          <h2 className="mt-4 font-serif text-4xl text-[#f7efe2] sm:text-5xl">
            Trusted Across Manhattan
          </h2>

          <div className="mt-6 text-lg tracking-[0.28em] text-[#d6ab5f]">
            ★★★★★
          </div>

          <p className="mt-5 max-w-xl text-base leading-8 text-[#eadcca]">
            “Finally found a cleaning company in NYC that feels truly premium.
            My apartment has never looked better.”
          </p>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#d6ab5f]">
              — Sarah M., Tribeca
            </p>

            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-[#a8792f] bg-[#151008] px-5 py-3 text-sm font-semibold text-[#e7c176] transition hover:border-[#d6ab5f] hover:bg-[#1c1409]"
            >
              Write a Review →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingCTASection() {
  return (
    <section className="bg-[#050403] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden border border-[#a8792f] bg-[#090806]">
        <div className="relative grid gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_auto] lg:items-center lg:py-12">
          <Image
            src="/images/home/cta-skyline.png"
            alt="NYC skyline line art"
            fill
            sizes="100vw"
            className="object-cover opacity-12"
          />

          <div className="relative z-10">
            <h2 className="font-serif text-3xl leading-tight text-[#f7efe2] sm:text-4xl">
              Ready To Book Your Cleaning?
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#d8cbbb]">
              Choose your service, select your preferred schedule, and complete
              your booking through secure checkout.
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row lg:justify-end">
            <Link
              href="/onboarding/user"
              className="rounded-xl bg-[#d6ab5f] px-6 py-4 text-center text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Book Your Cleaning
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const quickLinks = [
    { label: "Home", href: "#home" },
    { label: "Services", href: "#services" },
    { label: "About", href: "#about" },
    { label: "Our Story", href: "/our-story" },
    { label: "Reviews", href: "#reviews" },
  ];

  const serviceLinks = [
    { label: "SoHo Signature", href: "/services/standard-cleaning" },
    { label: "SoHo Signature Deep", href: "/services/deep-cleaning" },
    { label: "Move In / Move Out", href: "/services/move-in-move-out-cleaning" },
    { label: "Recurring Cleaning", href: "/services/recurring-cleaning" },
  ];

  const policyLinks = [
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

  return (
    <footer className="border-t border-[#3a2812] bg-black pb-24 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-5 lg:px-8">
        <div>
          <Image
            src="/images/soho-logo-n.png"
            alt="SoHo Cleaning Group"
            width={260}
            height={70}
            className="h-auto w-[190px] sm:w-[240px]"
          />

          <p className="mt-4 max-w-xs text-sm leading-7 text-[#c5bdaf]">
            Premium home cleaning for Manhattan residents who value trust,
            consistency, and elevated service.
          </p>
        </div>

        <FooterColumn title="Quick Links" items={quickLinks} />

        <FooterColumn title="Services" items={serviceLinks} />

        <FooterColumn title="Policies" items={policyLinks} />

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d8b066]">
            Contact Us
          </h3>

          <div className="mt-5 space-y-3 text-sm leading-7 text-[#d8d0c1]">
            <a href={phoneHref} className="block hover:text-[#e3bd74]">
              {phoneNumber}
            </a>

            <a href={`mailto:${email}`} className="block hover:text-[#e3bd74]">
              {email}
            </a>

            <p>New York, NY</p>
            <p>Serving all of Manhattan</p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#3a2812] px-4 py-5 text-center text-xs text-[#8f8778]">
        © 2026 SoHo Cleaning Group. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d8b066]">
        {title}
      </h3>

      <div className="mt-5 space-y-3 text-sm text-[#d8d0c1]">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="block transition hover:text-[#e3bd74]"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileCTA() {
  return (
    <div className="fixed inset-x-4 bottom-5 z-50 grid grid-cols-2 gap-3 md:hidden">
      <a
        href={phoneHref}
        className="flex h-14 items-center justify-center rounded-xl border border-[#8f6b2f] bg-black/90 text-sm font-semibold text-[#e3bd74] backdrop-blur"
      >
        Call Us
      </a>

      <Link
        href="/onboarding/user"
        className="flex h-14 items-center justify-center rounded-xl bg-[#d6ab5f] text-sm font-semibold text-black"
      >
        Book Now
      </Link>
    </div>
  );
}
