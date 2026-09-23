"use client";

import { useState } from "react";

type IdDocumentType = "NATIONAL_ID" | "PASSPORT";

export default function ProfessionalDocumentReuploadForm({
  token,
  professionalName,
  currentDocumentType,
}: {
  token: string;
  professionalName: string;
  currentDocumentType: IdDocumentType | null;
}) {
  const [idDocumentType, setIdDocumentType] = useState<IdDocumentType>(
    currentDocumentType || "NATIONAL_ID"
  );
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const uploadDocument = async (file: File, side: "front" | "back") => {
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

    if (!allowedTypes.includes(file.type)) {
      alert("Only PDF, PNG, JPG, and JPEG files are allowed.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB.");
      return;
    }

    try {
      if (side === "front") {
        setIsUploadingFront(true);
      } else {
        setIsUploadingBack(true);
      }

      const formData = new FormData();
      formData.set("file", file);
      formData.set("kind", side === "front" ? "id-front" : "id-back");
      formData.set("flow", "reupload");
      formData.set("token", token);

      const response = await fetch("/api/uploads/professional", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success || typeof result.value !== "string") {
        throw new Error(result.message || "Upload failed.");
      }

      if (side === "front") setFrontUrl(result.value);
      else setBackUrl(result.value);
    } catch (error) {
      console.error(error);
      alert("Document upload failed. Please try again.");
    } finally {
      setIsUploadingFront(false);
      setIsUploadingBack(false);
    }
  };

  const submitDocuments = async () => {
    try {
      setIsSubmitting(true);

      if (!frontUrl || !backUrl) {
        alert("Please upload both required documents.");
        return;
      }

      const response = await fetch("/api/professional/documents/reupload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          idDocumentType,
          idDocumentFrontUrl: frontUrl,
          idDocumentBackUrl: backUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong");
      }

      setIsSuccess(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
        <section className="mx-auto flex min-h-[85vh] max-w-2xl items-center justify-center">
          <div className="rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#d6ab5f] bg-[#151008] text-4xl text-[#d6ab5f]">
              ✓
            </div>
            <h1 className="font-serif text-4xl text-white">Documents Submitted</h1>
            <p className="mt-4 text-[#cfc7b7]">
              Thank you. Your updated ID documents have been submitted for review.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
            ID Document Reupload
          </p>
          <h1 className="font-serif text-4xl text-white sm:text-5xl">
            Hello, {professionalName}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[#d6d0c5]">
            Please upload your updated ID documents. Accepted formats: PDF, PNG,
            JPG, JPEG. Maximum 2MB per file.
          </p>
        </div>

        <div className="rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 sm:p-10">
          <div className="mb-6">
            <p className="mb-3 text-sm font-medium text-[#d8d0c1]">
              Select ID Document Type
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <OptionButton
                label="National ID"
                selected={idDocumentType === "NATIONAL_ID"}
                onClick={() => {
                  setIdDocumentType("NATIONAL_ID");
                  setFrontUrl("");
                  setBackUrl("");
                }}
              />

              <OptionButton
                label="Passport"
                selected={idDocumentType === "PASSPORT"}
                onClick={() => {
                  setIdDocumentType("PASSPORT");
                  setFrontUrl("");
                  setBackUrl("");
                }}
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DocumentUploadBox
              label={
                idDocumentType === "PASSPORT"
                  ? "Passport First Page"
                  : "National ID Front Side"
              }
              value={frontUrl}
              isUploading={isUploadingFront}
              onChange={(file) => uploadDocument(file, "front")}
            />

            <DocumentUploadBox
              label={
                idDocumentType === "PASSPORT"
                  ? "Passport Last Page"
                  : "National ID Back Side"
              }
              value={backUrl}
              isUploading={isUploadingBack}
              onChange={(file) => uploadDocument(file, "back")}
            />
          </div>

          <button
            type="button"
            onClick={submitDocuments}
            disabled={isSubmitting || !frontUrl || !backUrl}
            className="mt-8 w-full rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Submitting..." : "Submit Updated Documents"}
          </button>
        </div>
      </section>
    </main>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-5 py-4 text-left text-sm transition ${
        selected
          ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
          : "border-[#2f291d] bg-[#111111] text-[#d8d0c1]"
      }`}
    >
      {selected ? "✓" : "○"} {label}
    </button>
  );
}

function DocumentUploadBox({
  label,
  value,
  isUploading,
  onChange,
}: {
  label: string;
  value: string;
  isUploading: boolean;
  onChange: (file: File) => void;
}) {
  return (
    <div className="rounded-[28px] border border-[#2f291d] bg-[#111111] p-5">
      <p className="mb-3 text-sm font-medium text-[#d8d0c1]">{label}</p>

      <div className="mb-4 flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#3a2812] bg-[#0a0a0a]">
        {value ? (
          <div className="text-center">
            <p className="font-serif text-4xl text-[#d6ab5f]">✓</p>
            <p className="mt-3 text-sm text-[#e3bd74]">Securely uploaded</p>
          </div>
        ) : (
          <p className="px-6 text-center text-sm text-[#8f8778]">
            No file uploaded yet.
          </p>
        )}
      </div>

      <label
        className={`inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${
          isUploading
            ? "cursor-not-allowed bg-[#2a2419] text-[#7e7464]"
            : "cursor-pointer bg-[#d6ab5f] text-black hover:scale-[1.02]"
        }`}
      >
        {isUploading ? "Uploading..." : value ? "Replace File" : "Upload File"}

        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
          disabled={isUploading}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onChange(file);
            event.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
