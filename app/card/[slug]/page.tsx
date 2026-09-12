import Image from "next/image";
import { notFound } from "next/navigation";
import { businessCards } from "@/data/cards";

export default async function BusinessCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const card = businessCards[slug];

  if (!card) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#050403] px-5 py-8 text-white">
      <section className="mx-auto flex min-h-[90vh] max-w-md flex-col items-center justify-center text-center">
        <Image
          src="/images/soho-logo-new.png"
          alt="SoHo Cleaning Group"
          width={250}
          height={80}
          priority
          className="h-auto w-[220px]"
        />

        <div className="mt-8 w-full rounded-[32px] border border-[#3a2812] bg-[#0a0a0a] p-7 shadow-[0_24px_80px_rgba(214,171,95,0.12)]">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#8f6b2f] bg-[#151008]">
            <Image
              src={card.image}
              alt={card.name}
              width={112}
              height={112}
              className="h-full w-full object-cover"
            />
          </div>

          <h1 className="mt-6 font-serif text-4xl text-white">{card.name}</h1>

          <p className="mt-2 text-sm uppercase tracking-[0.24em] text-[#d6ab5f]">
            {card.title}
          </p>

          <p className="mt-4 text-sm leading-7 text-[#cfc7b7]">{card.bio}</p>

          <div className="mt-8 grid gap-4">
            <a
              href={card.website}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Visit Website
            </a>

            <a
              href={card.instagram}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Instagram
            </a>

            <a
              href={`tel:${card.phone}`}
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Call
            </a>

            <a
              href={`mailto:${card.email}`}
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Email
            </a>

            <a
              href="https://g.page/r/CcebMKcdVpKsEBM/review"
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Write a Review
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}