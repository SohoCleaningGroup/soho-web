import Image from "next/image";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createProfileViewUrl } from "@/lib/professional-documents";
import { hasValidAdminSession } from "@/lib/security/admin-auth";

type ProfessionalItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  profileImageUrl: string | null;
  experienceYears: number | null;
  servicesOffered: string[];
  serviceAreas: string[];
  availability: string[];
  hasOwnSupplies: boolean;
  hasTransport: boolean;
  bio: string | null;
  status: string;
  createdAt: Date;
};

export default async function AdminProfessionalsPage() {
    if (!(await hasValidAdminSession())) {
        redirect("/admin/login");
    }

    const professionals = await prisma.professionalProfile.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
    const professionalItems = await Promise.all(
        professionals.map(async (professional) => ({
            ...professional,
            profileImageUrl: await createProfileViewUrl(professional.profileImageUrl),
        }))
    );

    return (
        <section>
            <div className="mb-10">
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
                    Professionals
                </p>

                <h1 className="font-serif text-5xl text-white">
                    Professional Applications
                </h1>

                <p className="mt-4 text-[#cfc7b7]">
                    Review cleaning professional joining requests.
                </p>
            </div>

            {professionalItems.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="grid gap-6">
                    {professionalItems.map((professional: ProfessionalItem) => (
                        <article
                            key={professional.id}
                            className="rounded-[28px] border border-[#2a2419] bg-[#0a0a0a] p-6"
                        >
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex gap-5">
                                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#8f6b2f] bg-[#151008] font-serif text-2xl text-[#d6ab5f]">
                                        {professional.profileImageUrl ? (
                                            <Image
                                                src={professional.profileImageUrl}
                                                alt={professional.fullName}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            getInitials(professional.fullName)
                                        )}
                                    </div>

                                    <div>
                                        <h2 className="font-serif text-3xl text-white">
                                            {professional.fullName}
                                        </h2>

                                        <p className="mt-1 text-sm text-[#cfc7b7]">
                                            {professional.email}
                                        </p>

                                        <p className="mt-1 text-sm text-[#cfc7b7]">
                                            {professional.phone}
                                        </p>

                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <StatusBadge status={professional.status} />
                                            <SmallBadge>
                                                {professional.experienceYears ?? 0} years experience
                                            </SmallBadge>
                                            <SmallBadge>
                                                Supplies: {professional.hasOwnSupplies ? "Yes" : "No"}
                                            </SmallBadge>
                                            <SmallBadge>
                                                Transport: {professional.hasTransport ? "Yes" : "No"}
                                            </SmallBadge>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col items-start gap-3 lg:items-end">
                                    <div className="text-sm text-[#8f8778]">
                                        Applied: {professional.createdAt.toLocaleDateString("en-US")}
                                    </div>

                                    <Link
                                        href={`/admin/dashboard/professionals/${professional.id}`}
                                        className="inline-flex rounded-xl border border-[#8f6b2f] px-4 py-2 text-xs font-medium text-[#e3bd74] transition hover:bg-[#151008]"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-5 lg:grid-cols-3">
                                <InfoBlock
                                    label="Services"
                                    value={
                                        professional.servicesOffered.length
                                            ? professional.servicesOffered.map(formatLabel).join(", ")
                                            : "Not selected"
                                    }
                                />

                                <InfoBlock
                                    label="Service Areas"
                                    value={
                                        professional.serviceAreas.length
                                            ? professional.serviceAreas.join(", ")
                                            : "Not provided"
                                    }
                                />

                                <InfoBlock
                                    label="Availability"
                                    value={
                                        professional.availability.length
                                            ? professional.availability.map(formatLabel).join(", ")
                                            : "Not selected"
                                    }
                                />
                            </div>

                            <div className="mt-5 rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
                                <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                                    Bio / Work Background
                                </p>

                                <p className="mt-3 text-sm leading-7 text-[#f3eadb]">
                                    {professional.bio || "No bio provided."}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
                {label}
            </p>

            <p className="mt-3 text-sm leading-7 text-[#f3eadb]">{value}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className="inline-flex rounded-full border border-[#8f6b2f] bg-[#151008] px-3 py-1 text-xs font-medium text-[#d6ab5f]">
            {formatLabel(status)}
        </span>
    );
}

function SmallBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex rounded-full border border-[#2f291d] bg-[#111111] px-3 py-1 text-xs text-[#cfc7b7]">
            {children}
        </span>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-[#3a2812] bg-[#0a0a0a] px-6 text-center">
            <p className="text-sm text-[#8f8778]">
                No professional applications available yet.
            </p>
        </div>
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
