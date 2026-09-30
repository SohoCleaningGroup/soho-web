export const BOOKING_SMS_CONSENT_VERSION = "booking-updates-v1";

type BookingSmsConsent = {
  acceptedSmsConsent: boolean;
  smsConsentAt: Date | null;
  smsConsentPhone: string | null;
  smsConsentVersion: string | null;
};

export function consentFromCheckoutMetadata(metadata: Record<string, string>): BookingSmsConsent {
  const at = metadata.smsConsentAt ? new Date(metadata.smsConsentAt) : null;
  const accepted = metadata.acceptedSmsConsent === "true" &&
    metadata.smsConsentVersion === BOOKING_SMS_CONSENT_VERSION &&
    at !== null && Number.isFinite(at.getTime()) &&
    /^\+[1-9]\d{7,14}$/.test(metadata.phone ?? "");
  return {
    acceptedSmsConsent: accepted,
    smsConsentAt: accepted ? at : null,
    smsConsentPhone: accepted ? metadata.phone : null,
    smsConsentVersion: accepted ? BOOKING_SMS_CONSENT_VERSION : null,
  };
}

export function hasBookingSmsConsent(consent: BookingSmsConsent | null, phone: string): boolean {
  return consent?.acceptedSmsConsent === true &&
    consent.smsConsentAt !== null && Number.isFinite(consent.smsConsentAt.getTime()) &&
    consent.smsConsentPhone === phone &&
    consent.smsConsentVersion === BOOKING_SMS_CONSENT_VERSION;
}
