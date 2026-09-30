import "server-only";
import { sendEmail } from "@/lib/sendgrid";
import { getProfessionalApprovedEmail } from "@/lib/customer-email-templates";

export function cleanerHandbookUrl(language: "en" | "es" = "en") {
  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  const base = process.env.VERCEL_ENV === "preview" && previewHost ? `https://${previewHost}` : process.env.NEXT_PUBLIC_APP_URL;
  if (!base || !base.startsWith("https://")) throw new Error("The website URL is not configured.");
  return new URL(language === "es" ? "/professional/handbook/es" : "/professional/handbook", base).toString();
}

export async function sendCleanerApprovalEmail(professional: { fullName: string; email: string }) {
  try {
    const template = getProfessionalApprovedEmail({ professionalName: professional.fullName, handbookUrl: cleanerHandbookUrl(), spanishHandbookUrl: cleanerHandbookUrl("es") });
    return await sendEmail({ to: [professional.email], ...template });
  } catch (error) {
    console.error("PROFESSIONAL_APPROVAL_EMAIL_FAILED", error);
    return false;
  }
}
