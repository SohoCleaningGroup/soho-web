import "server-only";
import { sendEmail } from "@/lib/sendgrid";
import { getProfessionalApprovedEmail } from "@/lib/customer-email-templates";
import { issueHiringTermsLink } from "@/lib/cleaner-hiring-signature";

export function cleanerHandbookUrl(language: "en" | "es" = "en", cleanerName?: string) {
  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  const base = process.env.VERCEL_ENV === "preview" && previewHost ? `https://${previewHost}` : process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !base.startsWith("https://")) throw new Error("The website URL is not configured.");
  const url = new URL(language === "es" ? "/professional/handbook/es" : "/professional/handbook", base);
  if (cleanerName?.trim()) url.searchParams.set("name", cleanerName.trim());
  return url.toString();
}

export async function sendCleanerApprovalEmail(professional: { id: string; fullName: string; email: string; hiringTermsSignedAt: Date | null }) {
  try {
    const hiringTermsUrl = await issueHiringTermsLink(professional);
    const template = getProfessionalApprovedEmail({ professionalName: professional.fullName, handbookUrl: cleanerHandbookUrl("en", professional.fullName), spanishHandbookUrl: cleanerHandbookUrl("es", professional.fullName), hiringTermsUrl });
    return await sendEmail({ to: [professional.email], ...template });
  } catch (error) {
    console.error("PROFESSIONAL_APPROVAL_EMAIL_FAILED", error);
    return false;
  }
}
