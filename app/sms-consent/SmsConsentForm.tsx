"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PUBLIC_SMS_DISCLOSURE } from "@/lib/messaging/sms-disclosures";

export default function SmsConsentForm() {
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/sms/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: data.get("fullName"), email: data.get("email"), phone: data.get("phone"), accepted }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not save your choice.");
      setSaved(result.accepted);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save your choice. Please try again."); }
    finally { setBusy(false); }
  }
  if (saved !== null) return <div className="mt-8 rounded-2xl border border-[#3a2812] p-6" role="status">
    <h2 className="text-xl">Your choice is saved.</h2>
    <p className="mt-4 leading-7 text-[#d6d0c5]">{saved ? "You agreed to receive SoHo Cleaning Group booking updates by text. No verification code is needed to save your consent. Service texts begin only after you complete a booking with a verified phone number." : "You chose not to receive booking updates by text. You can still book and receive updates by email."}</p>
    {/* A full navigation reads the newly signed consent cookie instead of a prefetched booking response. */}
    {/* eslint-disable-next-line @next/next/no-location-assign-relative-destination */}
    <button type="button" onClick={() => window.location.assign("/onboarding/user")} className="mt-6 inline-block rounded-xl bg-[#d6ab5f] px-5 py-3 font-semibold text-black">Continue to booking</button>
    <p className="mt-4 text-sm text-[#d6d0c5]">Your choice carries into booking in this browser for 30 minutes. You can change it before checkout.</p>
    <button type="button" onClick={() => { setSaved(null); setAccepted(false); }} className="mt-4 block text-[#d6ab5f] underline">Change my choice</button>
  </div>;
  return <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-[#3a2812] bg-[#0a0a0a] p-6">
    <fieldset disabled={busy} className="space-y-5">
      <label className="block">Full name<input required name="fullName" autoComplete="name" minLength={2} maxLength={120} className="mt-2 block w-full rounded-xl border border-[#3a2812] bg-[#111] p-3" /></label>
      <label className="block">Email address<input required name="email" type="email" autoComplete="email" maxLength={254} className="mt-2 block w-full rounded-xl border border-[#3a2812] bg-[#111] p-3" /></label>
      <label className="block">US mobile number<input required name="phone" type="tel" autoComplete="tel" maxLength={40} placeholder="(212) 555-0123" className="mt-2 block w-full rounded-xl border border-[#3a2812] bg-[#111] p-3" /></label>
      <label className="flex items-start gap-3"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#d6ab5f]" /><span className="text-sm leading-7 text-[#d6d0c5]">{PUBLIC_SMS_DISCLOSURE}</span></label>
      <p className="text-sm leading-7 text-[#d6d0c5]">Read our <Link href="/privacy-policy" className="text-[#d6ab5f] underline">Privacy Policy</Link> and <Link href="/terms-and-conditions" className="text-[#d6ab5f] underline">Terms &amp; Conditions</Link>. Mobile numbers and SMS consent are not shared with third parties or affiliates for marketing or promotional purposes.</p>
      <p className="text-sm leading-7 text-[#d6d0c5]">Leave the checkbox unchecked to receive booking updates by email. Saving your choice does not send a text or verify your phone.</p>
      <button type="submit" className="w-full rounded-xl bg-[#d6ab5f] p-4 font-semibold text-black disabled:opacity-50">{busy ? "Saving…" : "Save my SMS preference"}</button>
    </fieldset>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <Link prefetch={false} href="/onboarding/user" className="block text-center text-sm text-[#d6ab5f] underline">Continue to booking without signing up for texts</Link>
  </form>;
}
