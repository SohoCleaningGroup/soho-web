"use client";

import { useState } from "react";

export default function HiringTermsForm({ token, fullName, language }: { token: string; fullName: string; language: "en" | "es" }) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signed, setSigned] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/professional/hiring/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, agreed, language }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to sign these terms.");
      setSigned(true);
      setMessage(result.emailSent
        ? language === "es" ? "Firmado. Enviamos una copia a tu correo electrónico." : "Signed. We emailed you a copy."
        : language === "es" ? "Firmado. Comunícate con SoHo si no recibes tu copia por correo." : "Signed. Contact SoHo if your email copy does not arrive.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 rounded-2xl border border-[#8f6b2f] p-6">
    <p className="text-[#e8dfce]">{language === "es" ? "Firma escribiendo tu nombre completo tal como aparece en tu solicitud:" : "Sign by typing your full name as it appears on your application:"} <strong>{fullName}</strong></p>
    <label htmlFor="signature-name" className="mt-5 block text-sm text-[#e8dfce]">{language === "es" ? "Nombre completo" : "Full name"}</label>
    <input id="signature-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={120} disabled={signed || busy} className="mt-2 w-full rounded-xl border border-[#8f6b2f] bg-[#101010] p-3 text-white" />
    <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#e8dfce]"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} required disabled={signed || busy} className="mt-1" /><span>{language === "es" ? "Soy la persona indicada arriba. Leí y acepto firmar electrónicamente la versión de los términos mostrada en esta página." : "I am the person named above. I have read and agree to electronically sign the version of the terms shown on this page."}</span></label>
    <button type="submit" disabled={busy || signed || !agreed} className="mt-6 rounded-xl bg-[#d6ab5f] px-6 py-3 font-medium text-black disabled:opacity-50">{busy ? language === "es" ? "Firmando…" : "Signing…" : language === "es" ? "Firmar términos" : "Sign terms"}</button>
    {message && <p role="status" className="mt-5 text-sm text-[#e3bd74]">{message}</p>}
  </form>;
}
