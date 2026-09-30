import { notFound } from "next/navigation";
import HiringTermsForm from "@/components/professional/HiringTermsForm";
import { hiringTerms } from "@/lib/cleaner-hiring-terms";
import { getHiringTermsSigner } from "@/lib/cleaner-hiring-signature";
import { NO_INDEX_METADATA } from "@/lib/site";

export const metadata = { ...NO_INDEX_METADATA, title: "Sign hiring terms | SoHo Cleaning Group" };

export default async function HiringTermsPage({ params, searchParams }: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const signer = await getHiringTermsSigner(token);
  if (!signer) notFound();
  const language = query.lang === "es" ? "es" : "en";
  const terms = hiringTerms(language);
  return <main lang={language} className="min-h-screen bg-[#060606] px-5 py-12 text-white">
    <div className="mx-auto max-w-3xl">
      <p className="text-sm uppercase tracking-[0.2em] text-[#d6ab5f]">SoHo Cleaning Group</p>
      <a className="mt-5 inline-block text-sm text-[#e3bd74] underline" href={`/professional/hiring/${token}${language === "es" ? "" : "?lang=es"}`}>{language === "es" ? "Read in English" : "Leer en español"}</a>
      <h1 className="mt-6 font-serif text-4xl">{language === "es" ? "Lee y firma tus términos de contratación" : "Read and sign your hiring terms"}</h1>
      <p className="mt-4 text-[#e8dfce]">{language === "es" ? "Preparado para" : "Prepared for"} {signer.fullName}</p>
      <p className="mt-2 text-sm text-[#cfc7b7]">{language === "es" ? "Versión" : "Version"}: {signer.hiringTermsVersion || terms.version}</p>
      <div className="mt-8 whitespace-pre-wrap rounded-2xl border border-[#8f6b2f] bg-[#0a0a0a] p-6 leading-8 text-[#e8dfce]">{signer.hiringTermsSnapshot || terms.text}</div>
      {signer.hiringTermsSignedAt
        ? <p className="mt-8 rounded-xl border border-[#8f6b2f] p-5 text-[#e3bd74]">{language === "es" ? "Tu firma quedó registrada. Si no recibiste una copia por correo electrónico, comunícate con SoHo." : "Your signature is recorded. Contact SoHo if you did not receive an email copy."}</p>
        : <HiringTermsForm token={token} fullName={signer.fullName} language={language} />}
    </div>
  </main>;
}
