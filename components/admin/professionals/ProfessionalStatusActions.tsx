"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";

export default function ProfessionalStatusActions({
  professionalId,
  currentStatus,
}: {
  professionalId: string;
  currentStatus: Status;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<Status | "RESEND" | "ADMIN_NOTICE" | null>(null);

  const [message, setMessage] = useState("");

  const updateStatus = async (status: Status | "RESEND") => {
    try {
      setIsLoading(status);
      setMessage("");

      const response = await fetch("/api/admin/professionals/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          professionalId,
          ...(status === "RESEND" ? { resendApprovalEmail: true } : { status }),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong");
      }

      setMessage(result.message);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(null);
    }
  };

  const buttons: Array<{ label: string; status: Status }> = [
    { label: "Mark Under Review", status: "UNDER_REVIEW" },
    { label: "Approve", status: "APPROVED" },
    { label: "Reject", status: "REJECTED" },
    { label: "Reset to Pending", status: "PENDING" },
  ];

  return (
    <div>
      <p className="mb-4 text-sm text-[#cfc7b7]">Approving a cleaner sends their handbook and a private link to sign the hiring terms. Job invitations wait for the signature.</p>
      <div className="grid gap-3 sm:grid-cols-2">
      {buttons.map((button) => (
        <button
          key={button.status}
          type="button"
          onClick={() => updateStatus(button.status)}
          disabled={isLoading !== null || currentStatus === button.status}
          className="rounded-2xl border border-[#8f6b2f] px-5 py-3 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading === button.status ? "Updating..." : button.label}
        </button>
      ))}
      </div>
      {currentStatus === "APPROVED" && <button type="button" onClick={() => updateStatus("RESEND")} disabled={isLoading !== null} className="mt-4 rounded-2xl border border-[#8f6b2f] px-5 py-3 text-sm text-[#e3bd74] disabled:opacity-40">{isLoading === "RESEND" ? "Sending…" : "Resend approval email & handbook"}</button>}
      <button type="button" onClick={async () => {
        setIsLoading("ADMIN_NOTICE");
        setMessage("");
        try {
          const response = await fetch("/api/admin/professionals/resend-admin-notice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ professionalId }),
          });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.message || "Could not send the admin notice.");
          setMessage(result.message);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Could not send the admin notice.");
        } finally {
          setIsLoading(null);
        }
      }} disabled={isLoading !== null} className="mt-4 block rounded-2xl border border-[#8f6b2f] px-5 py-3 text-sm text-[#e3bd74] disabled:opacity-40">{isLoading === "ADMIN_NOTICE" ? "Sending…" : "Resend admin application notice"}</button>
      {message && <p role="status" className="mt-4 text-sm text-[#e3bd74]">{message}</p>}
    </div>
  );
}
