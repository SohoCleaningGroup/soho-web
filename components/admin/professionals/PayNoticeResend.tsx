"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function PayNoticeResend({ id, signed }: { id: string; signed: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  async function resend() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/professionals/pay-notice/resend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to resend.");
      setMessage(result.emailSent ? "Email sent." : "Email was not sent. Use the private link below or try again.");
      setLink(result.signingUrl || ""); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 space-y-3">
    <div className="flex flex-wrap gap-3">
      <button disabled={busy} onClick={() => void resend()} className="rounded-xl border border-[#8f6b2f] px-4 py-2 text-[#e3bd74] disabled:opacity-50">{busy ? "Sending…" : signed ? "Resend signed copy" : "Resend signing link"}</button>
      <a href={`/api/admin/professionals/pay-notice/copy?id=${encodeURIComponent(id)}`} className="rounded-xl border border-[#8f6b2f] px-4 py-2 text-[#e3bd74]">Download record</a>
    </div>
    {!signed && <p className="text-xs">Resending replaces the previous unsigned signing link. It keeps the same notice text.</p>}
    {message && <p role="status">{message}</p>}
    {link && <a href={link} className="block break-all text-[#e3bd74] underline">Private signing link: {link}</a>}
  </div>;
}
