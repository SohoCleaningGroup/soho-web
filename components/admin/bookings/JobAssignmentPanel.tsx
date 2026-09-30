"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function JobAssignmentPanel({ bookingId, workers, current }: { bookingId: string; workers: {id: string; fullName: string}[]; current: {workerId: string; name: string; status: string; reviewStatus: string; reviewNote: string | null; photos: number} | null }) {
  const [worker, setWorker] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const router = useRouter();
  async function invite(professionalId = worker) {
    setBusy(true);
    try { const response = await fetch("/api/admin/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({bookingId, professionalId}) });
      const result = await response.json(); setMessage(result.message); if (response.ok) router.refresh();
    } catch { setMessage("Invitation failed. Try again."); } finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[#8f6b2f] p-6 space-y-4">
    <h2 className="text-xl text-[#e3bd74]">Worker assignment & customer review</h2>
    {current && <><p>{current.name} — {current.status.toLowerCase()}</p><p>Customer review: {current.reviewStatus.toLowerCase()} · {current.photos} photo(s)</p>{current.reviewNote && <p>Feedback: {current.reviewNote}</p>}</>}
    {current?.status !== "ACCEPTED" && <><label className="block">Approved worker<select className="block mt-2 bg-black border border-gray-600 p-3 rounded-xl w-full" value={worker} onChange={e => setWorker(e.target.value)}><option value="">Choose worker</option>{workers.map(w => <option key={w.id} value={w.id}>{w.fullName}</option>)}</select></label><button className="rounded-xl bg-[#d6ab5f] px-5 py-3 text-black disabled:opacity-50" disabled={busy || !worker} onClick={() => invite()}>{busy ? "Sending…" : "Email job invitation"}</button></>}
    {current?.status === "ACCEPTED" && <button className="rounded-xl border border-[#d6ab5f] px-5 py-3 disabled:opacity-50" disabled={busy} onClick={() => invite(current.workerId)}>Email a renewed worker link</button>}
    <p className="text-sm text-gray-400">The worker accepts by email link, uploads photos, and sends the customer a review request. Assigned jobs need customer approval before completion or payment capture. Text delivery is on hold.</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
