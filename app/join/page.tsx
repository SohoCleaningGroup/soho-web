import Image from "next/image";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cleaning Careers in Manhattan",
  description:
    "Apply to join SoHo Cleaning Group's in-house Manhattan cleaning team.",
  alternates: { canonical: "/join" },
};

const instagramUrl = "https://instagram.com/sohocleaninggroup";

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-[#050403] px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[90vh] max-w-md flex-col items-center justify-center text-center">
        <Image
          src="/images/soho-logo-new.png"
          alt="SoHo Cleaning Group"
          width={280}
          height={90}
          priority
          className="h-auto w-[240px]"
        />

        <div className="mt-10 w-full rounded-[32px] border border-[#3a2812] bg-[#0a0a0a] p-7 shadow-[0_24px_80px_rgba(214,171,95,0.12)]">
          <p className="text-xs uppercase tracking-[0.34em] text-[#b7924c]">
            We’re Hiring
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight text-white">
            Join SoHo Cleaning Group
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#cfc7b7]">
            Become part of a premium NYC cleaning brand focused on trust,
            professionalism, and white-glove care.
          </p>

          <div className="mt-8 grid gap-4">
            <Link
              href="/onboarding/professional"
              className="rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Join Our Team
            </Link>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Instagram
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
