"use client";
import { useState } from "react";
export default function PayNoticeForm({ token, fullName, language, hash, signed }: { token: string; fullName: string; language: "en" | "es"; hash: string; signed: boolean }) {
  const [name, setName] = useState("");
  const [primaryLanguage, setPrimaryLanguage] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const es = language === "es";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/professional/pay-notice/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, primaryLanguage, hash, agreed }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Please try again.");
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 print:hidden">
    <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#8f6b2f] px-5 py-3 text-[#e3bd74]">{es ? "Imprimir o guardar copia" : "Print or save a copy"}</button>
    {!signed && <form onSubmit={submit} className="mt-6 space-y-5 rounded-xl border border-[#8f6b2f] p-5">
      <p>{es ? "Si algún dato es incorrecto, comunícate con SoHo antes de firmar." : "If any details are incorrect, contact SoHo before signing."}</p>
      <label className="block">{es ? "Confirma tu idioma principal" : "Confirm your primary language"}<select required value={primaryLanguage} onChange={e => setPrimaryLanguage(e.target.value)} disabled={busy} className="mt-2 block w-full rounded-xl border border-[#8f6b2f] bg-[#101010] p-3"><option value="">{es ? "Selecciona" : "Choose"}</option><option value="en">English</option><option value="es">Español</option><option value="other">{es ? "Otro — solicita un aviso en tu idioma" : "Other — request a notice in your language"}</option></select></label>
      {primaryLanguage && primaryLanguage !== language && <p className="text-[#e3bd74]">{es ? "Solicita a SoHo un aviso en tu idioma principal antes de firmar." : "Ask SoHo for a notice in your primary language before signing."}</p>}
      <label className="block">{es ? "Escribe el nombre registrado en tu solicitud:" : "Type the name saved on your application:"} <strong>{fullName}</strong><input required maxLength={120} autoComplete="name" value={name} onChange={e => setName(e.target.value)} disabled={busy} className="mt-2 block w-full rounded-xl border border-[#8f6b2f] bg-[#101010] p-3" /></label>
      <label className="flex items-start gap-3 leading-7"><input type="checkbox" required checked={agreed} disabled={busy} onChange={e => setAgreed(e.target.checked)} className="mt-2" /><span>{es ? "Soy la persona indicada. Leí y recibí el aviso en inglés y español, confirmé mi idioma principal y acepto firmar electrónicamente este reconocimiento de recepción." : "I am the person named above. I read and received this notice in English, confirmed my primary language, and consent to electronically sign this acknowledgment of receipt."}</span></label>
      <button disabled={busy || !agreed || primaryLanguage !== language} className="rounded-xl bg-[#d6ab5f] px-5 py-3 text-black disabled:opacity-50">{busy ? es ? "Firmando…" : "Signing…" : es ? "Firmar reconocimiento" : "Sign acknowledgment"}</button>
      {message && <p role="status" className="text-[#e3bd74]">{message}</p>}
    </form>}
  </div>;
}
