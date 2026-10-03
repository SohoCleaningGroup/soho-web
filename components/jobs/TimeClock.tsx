"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { LocationSnapshot } from "@/lib/timeclock/rules";

async function captureLocation(): Promise<LocationSnapshot> {
  if (!navigator.geolocation) return { status: "unavailable" };
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      position => resolve({ status: "captured", latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracy: position.coords.accuracy, capturedAt: new Date(position.timestamp).toISOString() }),
      error => resolve({ status: error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable" }),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 }
    );
  });
}
export default function TimeClock({ token, activeId, canStart }: { token: string; activeId?: string; canStart: boolean }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function clock(action: "in" | "out") {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage("Getting your location…");
    try {
      const location = await captureLocation();
      setMessage("Saving your work time…");
      const response = await fetch("/api/jobs/timeclock", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action, timecardId: activeId, location }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setMessage(result.message + (location.status !== "captured" ? " Location was unavailable; SoHo will review it." : ""));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to record time. Please contact SoHo.");
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-[#8f6b2f] p-5">
    <h2 className="text-xl text-[#e3bd74]">Your work time</h2>
    <p className="text-sm text-gray-300">Clock-in and clock-out request your phone location for this job. Location is shared with SoHo for attendance review. We do not track you between clock actions. If location is unavailable, your hours will still be recorded.</p>
    {activeId ? <button disabled={busy} onClick={() => void clock("out")} className="rounded-xl bg-[#d6ab5f] px-5 py-3 font-semibold text-black disabled:opacity-50">Clock out</button>
      : canStart ? <button disabled={busy} onClick={() => void clock("in")} className="rounded-xl bg-[#d6ab5f] px-5 py-3 font-semibold text-black disabled:opacity-50">Clock in</button>
      : <p>Clock-in is unavailable for this job.</p>}
    <p role="status" aria-live="polite">{message || (activeId ? "You are clocked in." : "You are clocked out.")}</p>
    <p className="text-sm text-gray-400">Record all work time. Tell SoHo about missed punches, travel between jobs, training, or other work not captured here. No breaks are automatically deducted.</p>
  </section>;
}
