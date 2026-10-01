"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PayNoticeAction({ professionalId, fullName }: { professionalId: string; fullName: string }) {
  const router = useRouter();
  const [language, setLanguage] = useState("");
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("hiring");
  const [training, setTraining] = useState("25");
  const [regular, setRegular] = useState("30");
  const [lead, setLead] = useState("");
  const [preparer, setPreparer] = useState("Andy Vargas");
  const [title, setTitle] = useState("Owner");
  const [preview, setPreview] = useState<{ snapshot: string; hash: string; requestId: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  function invalidate() { setPreview(null); setConfirmed(false); setLink(""); }
  async function submit(action: "preview" | "send") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/professionals/pay-notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        action, professionalId, primaryLanguage: language, effectiveDate: date, reason,
        trainingRate: training ? Number(training) : null, regularRate: regular ? Number(regular) : null,
        leadRate: lead ? Number(lead) : null, preparerName: preparer, preparerTitle: title,
        expectedHash: preview?.hash, requestId: preview?.requestId,
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to prepare notice.");
      if (action === "preview") { setPreview({ snapshot: result.snapshot, hash: result.hash, requestId: crypto.randomUUID() }); setConfirmed(false); }
      else { setMessage(result.message); setLink(result.signingUrl); setPreview(null); setConfirmed(false); router.refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  const inputClass = "mt-2 w-full rounded-xl border border-[#8f6b2f] bg-[#101010] p-3 text-white";
  return <form onSubmit={event => { event.preventDefault(); void submit("preview"); }} className="mt-6 space-y-5">
    <p className="text-sm text-[#e8dfce]">Prepare a separate notice for {fullName}. Review the full text before emailing it. A pay change creates a new record and preserves earlier signed notices.</p>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm text-[#e8dfce]">Cleaner’s primary language<select required value={language} disabled={busy} onChange={e => { setLanguage(e.target.value); invalidate(); }} className={inputClass}><option value="">Choose language</option><option value="en">English</option><option value="es">Spanish — includes English copy</option></select></label>
      <label className="text-sm text-[#e8dfce]">Effective date<input required type="date" value={date} disabled={busy} onChange={e => { setDate(e.target.value); invalidate(); }} className={inputClass} /></label>
      <label className="text-sm text-[#e8dfce]">Reason<select value={reason} disabled={busy} onChange={e => { setReason(e.target.value); invalidate(); }} className={inputClass}><option value="hiring">At hiring</option><option value="change">Before a pay change</option></select></label>
      <label className="text-sm text-[#e8dfce]">Training rate per hour (blank if none)<input type="number" min="17" max="200" step="0.01" value={training} disabled={busy} onChange={e => { setTraining(e.target.value); invalidate(); }} className={inputClass} /></label>
      <label className="text-sm text-[#e8dfce]">Regular cleaner rate per hour<input required type="number" min="17" max="200" step="0.01" value={regular} disabled={busy} onChange={e => { setRegular(e.target.value); invalidate(); }} className={inputClass} /></label>
      <label className="text-sm text-[#e8dfce]">Lead rate per hour (blank if not offered)<input type="number" min="17" max="200" step="0.01" value={lead} disabled={busy} onChange={e => { setLead(e.target.value); invalidate(); }} className={inputClass} /></label>
      <label className="text-sm text-[#e8dfce]">Prepared by<input required maxLength={120} value={preparer} disabled={busy} onChange={e => { setPreparer(e.target.value); invalidate(); }} className={inputClass} /></label>
      <label className="text-sm text-[#e8dfce]">Preparer title<input required maxLength={80} value={title} disabled={busy} onChange={e => { setTitle(e.target.value); invalidate(); }} className={inputClass} /></label>
    </div>
    <button disabled={busy} type="submit" className="rounded-xl border border-[#8f6b2f] px-5 py-3 text-[#e3bd74] disabled:opacity-50">{busy ? "Working…" : "Review pay notice"}</button>
    {preview && <div className="space-y-5">
      <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl border border-[#8f6b2f] p-5 font-sans text-sm leading-7 text-[#e8dfce]">{preview.snapshot}</pre>
      <label className="flex items-start gap-3 text-sm leading-6 text-[#e8dfce]"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} className="mt-1" /><span>I checked this cleaner’s rates, primary language, effective date, employer details, and payday. This notice is ready to email.</span></label>
      <button type="button" disabled={busy || !confirmed} onClick={() => void submit("send")} className="rounded-xl bg-[#d6ab5f] px-5 py-3 text-black disabled:opacity-50">Email pay notice for signature</button>
    </div>}
    {message && <p role="status" className="text-sm text-[#e3bd74]">{message}</p>}
    {link && <div className="text-sm text-[#e8dfce]"><p>Private signing link — share only with this cleaner:</p><a className="mt-2 block break-all text-[#e3bd74] underline" href={link}>{link}</a></div>}
  </form>;
}
