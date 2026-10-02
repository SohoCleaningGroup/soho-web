import "server-only";
import { cookies } from "next/headers";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";
import { prisma } from "@/lib/prisma";
import { PUBLIC_SMS_CONSENT_VERSION } from "@/lib/messaging/public-sms-consent";

export const SMS_CONSENT_COOKIE = "soho_sms_consent";
export const SMS_CONSENT_SESSION_SECONDS = 30 * 60;
function secret() {
  const value = process.env.PHONE_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Consent session secret is not configured.");
  return `sms-consent:${value}`;
}
export function consentSessionToken(id: string) {
  return createSignedToken({ id }, secret(), SMS_CONSENT_SESSION_SECONDS);
}
export async function getConsentSession() {
  const token = (await cookies()).get(SMS_CONSENT_COOKIE)?.value;
  if (!token) return null;
  try {
    const value = verifySignedToken<{ id: string; exp: number }>(token, secret());
    if (!value || typeof value.id !== "string") return null;
    const record = await prisma.smsConsentRecord.findUnique({ where: { id: value.id } });
    if (!record || record.version !== PUBLIC_SMS_CONSENT_VERSION) return null;
    return { fullName: record.fullName, email: record.email, phone: record.phone.slice(2), acceptedSmsConsent: record.accepted };
  } catch {
    // A missing/expired consent session never grants messaging permission.
    return null;
  }
}
