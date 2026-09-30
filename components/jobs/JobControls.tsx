"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export default function JobControls({ token, mode, canRespond, canAddPhotos }: { token: string; mode: "worker" | "customer"; canRespond: boolean; canAddPhotos: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [note, setNote] = useState("");
  async function act(action: string) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action, note }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message);
      setMessage(result.message); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); } finally { setBusy(false); }
  }
  async function upload(file: File | undefined) {
    if (!file) return; setBusy(true); setMessage("");
    try {
      // Convert camera photos locally to fit mobile/server upload limits.
      const bitmap = await createImageBitmap(file); const ratio = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas"); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .82));
      if (!blob) throw new Error("Could not read this photo. Please choose a JPG or PNG.");
      const form = new FormData(); form.set("token", token); form.set("file", blob, "cleaning.jpg");
      const response = await fetch("/api/jobs/photo", { method: "POST", body: form }); const result = await response.json();
      if (!response.ok) throw new Error(result.message); setMessage(result.message); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Photo upload failed."); } finally { setBusy(false); }
  }
  const button = "rounded-xl bg-[#d6ab5f] px-5 py-3 font-semibold text-black disabled:opacity-50";
  return <div className="space-y-4">
    {mode === "worker" && canRespond && <div className="flex flex-wrap gap-4"><button className={button} disabled={busy} onClick={() => act("accept")}>Accept job</button><button className={button} disabled={busy} onClick={() => act("decline")}>Decline job</button></div>}
    {mode === "worker" && canAddPhotos && <><p>Upload finished-job photos without people, documents or personal belongings in view. Then send the customer review request.</p><label className="block">Finished-job photo<input className="mt-2 block" type="file" accept="image/*" disabled={busy} onChange={e => { void upload(e.target.files?.[0]); e.target.value = ""; }}/></label><button className={button} disabled={busy} onClick={() => act("review")}>Cleaning nearly done — send review</button></>}
    {mode === "customer" && canRespond && <><label className="block">Anything we should know?<textarea className="mt-2 block w-full rounded-xl border border-gray-600 bg-black p-3" value={note} maxLength={2000} onChange={e => setNote(e.target.value)} /></label><div className="flex flex-wrap gap-4"><button className={button} disabled={busy} onClick={() => act("approve")}>Everything looks good</button><button className={button} disabled={busy} onClick={() => act("attention")}>Something needs attention</button></div><p>Your response does not automatically charge your card. SoHo reviews it before finalizing payment.</p></>}
    {busy && <p role="status">Saving…</p>}{message && <p role="status">{message}</p>}
  </div>;
}
