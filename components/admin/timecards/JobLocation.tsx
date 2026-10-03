"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function JobLocation({ assignmentId, latitude, longitude, radius }: {
  assignmentId: string; latitude: number | null; longitude: number | null; radius: number;
}) {
  const router = useRouter();
  const [lat, setLat] = useState(latitude?.toString() || "");
  const [lng, setLng] = useState(longitude?.toString() || "");
  const [area, setArea] = useState(radius.toString());
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/timecards", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "site", assignmentId, latitude: Number(lat), longitude: Number(lng), radius: Number(area) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      setMessage("Job location saved."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  const cls = "block w-full rounded-lg border border-gray-600 bg-black p-2";
  return <details><summary className="cursor-pointer text-[#e3bd74]">Set the job location for distance checks</summary>
    <form onSubmit={save} className="mt-3 space-y-3">
      <p className="text-sm text-gray-300">Verify the building pin in a map, then enter its coordinates. Distance flags are for review and never remove hours.</p>
      <label className="block">Latitude<input type="number" step="any" required min="-90" max="90" className={cls} value={lat} onChange={e => setLat(e.target.value)} /></label>
      <label className="block">Longitude<input type="number" step="any" required min="-180" max="180" className={cls} value={lng} onChange={e => setLng(e.target.value)} /></label>
      <label className="block">Job area radius (meters)<input type="number" required min="25" max="1000" className={cls} value={area} onChange={e => setArea(e.target.value)} /></label>
      <button disabled={busy} className="rounded-lg border border-[#8f6b2f] px-4 py-2 disabled:opacity-50">Save job location</button><p role="status">{message}</p>
    </form>
  </details>;
}
