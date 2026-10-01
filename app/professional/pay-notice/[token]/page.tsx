import { notFound } from "next/navigation";
import { getPayNotice } from "@/lib/cleaner-pay-notice-service";
import { NO_INDEX_METADATA } from "@/lib/site";
import PayNoticeForm from "@/components/professional/PayNoticeForm";
export const metadata = { ...NO_INDEX_METADATA, title: "Your pay notice | SoHo Cleaning Group" };
export default async function PayNoticePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const notice = await getPayNotice(token);
  if (!notice) notFound();
  const language = notice.primaryLanguage === "es" ? "es" : "en";
  return <main lang={language} className="min-h-screen bg-[#060606] px-5 py-10 text-[#e8dfce] print:bg-white print:text-black">
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-4xl text-[#d6ab5f] print:text-black">{language === "es" ? "Tu aviso individual de pago" : "Your individual pay notice"}</h1>
      {notice.signedAt && <section role="status" className="mt-6 rounded-xl border border-[#8f6b2f] p-5">
        <p>{language === "es" ? "Firma registrada" : "Signature recorded"}: {notice.signedName}</p>
        <p>{notice.signedAt.toLocaleString("en-US", { timeZone: "America/New_York" })} (New York)</p>
        <p className="mt-3">{notice.receiptSentAt ? language === "es" ? "Enviamos una copia firmada a tu correo." : "We emailed a signed copy to you." : language === "es" ? "Tu firma está guardada. No pudimos enviar la copia por correo; imprime o guarda esta página y contacta a SoHo." : "Your signature is saved. The receipt email was not sent; print or save this page and contact SoHo."}</p>
      </section>}
      <pre className="mt-6 whitespace-pre-wrap rounded-xl border border-[#8f6b2f] p-5 font-sans leading-7">{notice.snapshot}</pre>
      <p className="mt-4 break-all text-xs">SHA-256: {notice.snapshotHash}</p>
      <PayNoticeForm token={token} fullName={notice.employeeName} language={language} hash={notice.snapshotHash} signed={Boolean(notice.signedAt)} />
    </div>
  </main>;
}
