"use client";

import { useState } from "react";

export default function HiringTermsForm({ token, fullName, language }: { token: string; fullName: string; language: "en" | "es" }) {
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [signed, setSigned] = useState(false);
  if (signed) return <section role="status" className="mt-8 rounded-2xl border border-[#8f6b2f] bg-[#0a0a0a] p-8 text-center">
    <h2 className="font-serif text-3xl text-[#d6ab5f]">{language === "es" ? "Gracias, recibimos tu firma" : "Thank you, your signature is recorded"}</h2>
    <p className="mt-4 text-[#e8dfce]">{language === "es" ? "Completaste la firma de tus términos de contratación. Puedes cerrar esta página." : "You have completed your hiring terms. You can close this page."}</p>
    <p className="mt-3 text-sm text-[#cfc7b7]">{language === "es" ? "Revisa tu correo para obtener una copia. Si no la recibes, comunícate con SoHo Cleaning Group." : "Check your email for a copy. If it does not arrive, contact SoHo Cleaning Group."}</p>
  </section>;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (normalize(name) !== normalize(fullName)) {
      setMessage(language === "es"
        ? `Escribe exactamente “${fullName}”, el nombre que aparece en tu solicitud.`
        : `Type “${fullName}” exactly as it appears on your application.`);
      return;
    }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/professional/hiring/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, name, agreed, language }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to sign these terms.");
      setSigned(true);
      window.location.replace(window.location.href);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-8 rounded-2xl border border-[#8f6b2f] p-6">
    <div className="mb-6 rounded-xl border border-[#5b4120] bg-[#151008] p-4">
      <p className="text-[#e8dfce]">{language === "es" ? "¿Prefieres firmar en inglés?" : "Prefer to read and sign in Spanish?"}</p>
      <a className="mt-2 inline-block font-medium text-[#e3bd74] underline" href={`/professional/hiring/${token}${language === "es" ? "" : "?lang=es"}`}>
        {language === "es" ? "Read and sign in English" : "Leer y firmar en español"}
      </a>
    </div>
    <p className="text-[#e8dfce]">{language === "es" ? "Escribe exactamente el nombre registrado en tu solicitud:" : "Type the exact name saved on your application:"} <strong>{fullName}</strong></p>
    <label htmlFor="signature-name" className="mt-5 block text-sm text-[#e8dfce]">{language === "es" ? "Nombre completo" : "Full name"}</label>
    <input id="signature-name" value={name} onChange={event => setName(event.target.value)} autoComplete="name" required maxLength={120} disabled={signed || busy} className="mt-2 w-full rounded-xl border border-[#8f6b2f] bg-[#101010] p-3 text-white" />
    <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-[#e8dfce]"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} required disabled={signed || busy} className="mt-1" /><span>{language === "es" ? "Soy la persona indicada arriba. Leí y acepto firmar electrónicamente la versión de los términos mostrada en esta página." : "I am the person named above. I have read and agree to electronically sign the version of the terms shown on this page."}</span></label>
    <button type="submit" disabled={busy || signed || !agreed} className="mt-6 rounded-xl bg-[#d6ab5f] px-6 py-3 font-medium text-black disabled:opacity-50">{busy ? language === "es" ? "Firmando…" : "Signing…" : language === "es" ? "Firmar términos" : "Sign terms"}</button>
    {message && <p role="status" className="mt-5 text-sm text-[#e3bd74]">{message}</p>}
  </form>;
}
