import { z } from "zod";

export { PUBLIC_SMS_CONSENT_VERSION, PUBLIC_SMS_DISCLOSURE } from "./sms-disclosures";

export function normalizeConsentPhone(value: string) {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

export const publicConsentSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().max(40).transform(normalizeConsentPhone).pipe(z.string().regex(/^\+1[2-9]\d{2}[2-9]\d{6}$/)),
  accepted: z.boolean(),
});
