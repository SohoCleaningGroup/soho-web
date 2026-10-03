"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const inputClass = "block w-full rounded-lg border border-gray-600 bg-black p-2 text-white";
export default function TimecardReview({ id, revision, startedAt, endedAt, approved }: {
  id: string; revision: number; startedAt: string; endedAt: string | null; approved: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [start, setStart] = useState(startedAt.slice(0, 16));
  const [end, setEnd] = useState(endedAt?.slice(0, 16) || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function act(action: "approve" | "correct") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/timecards", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revision, action, note, startAt: start ? start + ":00Z" : "", endAt: end ? end + ":00Z" : "" }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      setMessage(action === "approve" ? "Hours approved. Payroll has not been submitted." : "Correction saved. Hours need approval again.");
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <label className="block text-sm">Review or correction note<textarea className={inputClass} value={note} onChange={e => setNote(e.target.value)} maxLength={1000} /></label>
    <button disabled={busy || !endedAt || approved || !note.trim()} onClick={() => void act("approve")} className="rounded-lg bg-[#d6ab5f] px-4 py-2 text-black disabled:opacity-50">Approve hours</button>
    <details><summary className="cursor-pointer text-[#e3bd74]">Correct a missed or incorrect punch</summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm text-gray-300">Correction fields use UTC time. Original punches and locations remain in the history. Corrections require approval again.</p>
        <label className="block text-sm">Start time (UTC)<input type="datetime-local" className={inputClass} value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="block text-sm">End time (UTC)<input type="datetime-local" className={inputClass} value={end} onChange={e => setEnd(e.target.value)} /></label>
        <button disabled={busy || !note.trim()} onClick={() => void act("correct")} className="rounded-lg border border-[#8f6b2f] px-4 py-2 disabled:opacity-50">Save correction</button>
      </div>
    </details><p role="status">{message}</p>
  </div>;
}
