import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfessionalStatusActions from "@/components/admin/professionals/ProfessionalStatusActions";
import DocumentReuploadAction from "@/components/admin/professionals/DocumentReuploadAction";
import {
  createDocumentViewUrl,
  createProfileViewUrl,
} from "@/lib/professional-documents";
import { hasValidAdminSession } from "@/lib/security/admin-auth";

export default async function ProfessionalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!(await hasValidAdminSession())) {
    redirect("/admin/login");
  }

  const professional = await prisma.professionalProfile.findUnique({
    where: { id },
  });

  if (!professional) {
    notFound();
  }

  const [profileImageUrl, frontDocumentUrl, backDocumentUrl] = await Promise.all([
    createProfileViewUrl(professional.profileImageUrl),
    createDocumentViewUrl(professional.idDocumentFrontUrl),
    createDocumentViewUrl(professional.idDocumentBackUrl),
  ]);

  return (
    <section>
      <div className="mb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Professional Details
        </p>

        <h1 className="font-serif text-5xl text-white">
          {professional.fullName}
        </h1>

        <p className="mt-4 text-[#cfc7b7]">
          Review professional application details.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.7fr_1fr]">
        <div className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6 text-center">
          <div className="relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-[#8f6b2f] bg-[#151008] font-serif text-4xl text-[#d6ab5f]">
            {profileImageUrl ? (
              <Image
                src={profileImageUrl}
                alt={professional.fullName}
                fill
                sizes="128px"
                className="object-cover"
              />
            ) : (
              getInitials(professional.fullName)
            )}
          </div>

          <h2 className="mt-6 font-serif text-3xl text-white">
            {professional.fullName}
          </h2>

          <p className="mt-2 text-sm text-[#cfc7b7]">{professional.email}</p>
          <p className="mt-1 text-sm text-[#cfc7b7]">{professional.phone}</p>

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <StatusBadge status={professional.status} />

            <StatusBadge
              status={professional.idDocumentStatus || "NO_DOCUMENT"}
            />
          </div>
        </div>

        <div className="grid gap-6">
          <Panel title="Profile Information">
            <InfoGrid
              items={[
                ["Experience", `${professional.experienceYears ?? 0} years`],
                ["Own Supplies", professional.hasOwnSupplies ? "Yes" : "No"],
                ["Transport", professional.hasTransport ? "Yes" : "No"],
                [
                  "Applied On",
                  professional.createdAt.toLocaleDateString("en-US"),
                ],
              ]}
            />
          </Panel>

          <Panel title="Services & Availability">
            <InfoGrid
              items={[
                [
                  "Services Offered",
                  professional.servicesOffered.length
                    ? professional.servicesOffered.map(formatLabel).join(", ")
                    : "Not selected",
                ],
                [
                  "Service Areas",
                  professional.serviceAreas.length
                    ? professional.serviceAreas.join(", ")
                    : "Not provided",
                ],
                [
                  "Availability",
                  professional.availability.length
                    ? professional.availability.map(formatLabel).join(", ")
                    : "Not selected",
                ],
              ]}
            />
          </Panel>

          <Panel title="ID Documents">
            <InfoGrid
              items={[
                [
                  "Document Type",
                  professional.idDocumentType
                    ? formatLabel(professional.idDocumentType)
                    : "Not provided",
                ],
                [
                  "Document Status",
                  professional.idDocumentStatus
                    ? formatLabel(professional.idDocumentStatus)
                    : "Not provided",
                ],
              ]}
            />

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <DocumentPreviewCard
                title={
                  professional.idDocumentType === "PASSPORT"
                    ? "Passport First Page"
                    : "ID Front Side"
                }
                url={frontDocumentUrl}
              />

              <DocumentPreviewCard
                title={
                  professional.idDocumentType === "PASSPORT"
                    ? "Passport Last Page"
                    : "ID Back Side"
                }
                url={backDocumentUrl}
              />
            </div>
          </Panel>

          <Panel title="Bio / Work Background">
            <p className="text-sm leading-7 text-[#f3eadb]">
              {professional.bio || "No bio provided."}
            </p>
          </Panel>

          <Panel title="Admin Actions">
  <div className="grid gap-4">
    <ProfessionalStatusActions
      professionalId={professional.id}
      currentStatus={professional.status}
    />

    <DocumentReuploadAction professionalId={professional.id} />
  </div>
</Panel>
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6">
      <h2 className="mb-6 font-serif text-3xl text-white">{title}</h2>
      {children}
    </div>
  );
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
            {label}
          </p>

          <p className="mt-2 text-sm leading-6 text-[#f3eadb]">
            {value || "Not provided"}
          </p>
        </div>
      ))}
    </div>
  );
}

function DocumentPreviewCard({
  title,
  url,
}: {
  title: string;
  url: string | null;
}) {
  const isPdf = Boolean(url?.toLowerCase().includes(".pdf"));

  return (
    <div className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
      <p className="mb-4 text-sm font-medium text-[#d8d0c1]">{title}</p>

      <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#3a2812] bg-[#0a0a0a]">
        {!url ? (
          <p className="px-6 text-center text-sm text-[#8f8778]">
            No document uploaded.
          </p>
        ) : isPdf ? (
          <div className="text-center">
            <p className="font-serif text-5xl text-[#d6ab5f]">PDF</p>
            <p className="mt-3 text-xs text-[#8f8778]">Document uploaded</p>
          </div>
        ) : (
          <Image
            src={url}
            alt={title}
            width={500}
            height={320}
            className="max-h-[320px] w-full object-contain"
          />
        )}
      </div>

      {url && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-[#8f6b2f] px-4 py-3 text-center text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
          >
            View
          </a>

          <a
            href={url}
            download
            className="rounded-2xl bg-[#d6ab5f] px-4 py-3 text-center text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            Download
          </a>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-4 py-2 text-sm font-medium text-[#d6ab5f]">
      {formatLabel(status)}
    </span>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
