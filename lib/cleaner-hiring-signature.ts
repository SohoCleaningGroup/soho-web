import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendgrid";
import { hiringTerms } from "@/lib/cleaner-hiring-terms";

function hashToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}

export async function issueHiringTermsLink(professional: { id: string; hiringTermsSignedAt: Date | null }) {
  if (professional.hiringTermsSignedAt) return null;
  const token = randomBytes(32).toString("base64url");
  await prisma.professionalProfile.update({
    where: { id: professional.id },
    data: { hiringTermsTokenHash: hashToken(token), hiringTermsTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  });
  const previewHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  const base = process.env.VERCEL_ENV === "preview" && previewHost ? `https://${previewHost}` : process.env.NEXT_PUBLIC_APP_URL;
  if (!base?.startsWith("https://")) throw new Error("The website URL is not configured.");
  return new URL(`/professional/hiring/${token}`, base).toString();
}

export async function getHiringTermsSigner(token: string) {
  const hash = hashToken(token);
  if (!hash) return null;
  return prisma.professionalProfile.findFirst({
    where: { hiringTermsTokenHash: hash, hiringTermsTokenExpiresAt: { gt: new Date() }, status: "APPROVED" },
    select: { id: true, fullName: true, hiringTermsSignedAt: true, hiringTermsVersion: true, hiringTermsSnapshot: true },
  });
}

export async function signHiringTerms(token: string, name: string, language: "en" | "es", userAgent: string, ip: string) {
  const signer = await getHiringTermsSigner(token);
  if (!signer) throw new Error("This signing link has expired. Ask SoHo for a new one.");
  if (signer.hiringTermsSignedAt) throw new Error("These terms have already been signed.");
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalize(name) !== normalize(signer.fullName)) throw new Error("Enter your full name as it appears on your application.");
  const terms = hiringTerms(language);
  const signedAt = new Date();
  const result = await prisma.professionalProfile.updateMany({
    where: { id: signer.id, hiringTermsTokenHash: hashToken(token), hiringTermsTokenExpiresAt: { gt: signedAt }, hiringTermsSignedAt: null, status: "APPROVED" },
    data: { hiringTermsSignedAt: signedAt, hiringTermsSignedName: signer.fullName, hiringTermsVersion: `${terms.version}-${language}`, hiringTermsSnapshot: terms.text, hiringTermsHash: terms.hash, hiringTermsIp: ip.slice(0, 100), hiringTermsUserAgent: userAgent.slice(0, 500) },
  });
  if (result.count !== 1) throw new Error("These terms have already been signed or this link has expired.");
  const professional = await prisma.professionalProfile.findUniqueOrThrow({ where: { id: signer.id }, select: { email: true } });
  const receipt = `SoHo Cleaning Group — signed hiring terms\nSigned by: ${signer.fullName}\nSigned at: ${signedAt.toISOString()}\nVersion: ${terms.version}-${language}\nSHA-256: ${terms.hash}\n\n${terms.text}`;
  let emailSent = false;
  try {
    emailSent = await sendEmail({ to: [professional.email], subject: "Your signed SoHo hiring terms", text: receipt, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${receipt.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</pre>` });
  } catch (error) { console.error("HIRING_TERMS_RECEIPT_EMAIL_FAILED", error); }
  return { signedAt, emailSent };
}
