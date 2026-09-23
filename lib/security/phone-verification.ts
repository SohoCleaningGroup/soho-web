import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";

import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";

export const PHONE_VERIFICATION_COOKIE = "soho_phone_verified";
const PHONE_VERIFICATION_SECONDS = 30 * 60;

type PhoneVerification = {
  phone: string;
  exp: number;
};

function getVerificationSecret() {
  const secret =
    process.env.PHONE_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("A phone verification secret of at least 32 characters is required.");
  }
  return `phone-verification:${secret}`;
}

export function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

export function createPhoneVerificationToken(phone: string) {
  return createSignedToken(
    { phone: normalizePhone(phone) },
    getVerificationSecret(),
    PHONE_VERIFICATION_SECONDS
  );
}

export async function isPhoneVerified(phone: string) {
  const token = (await cookies()).get(PHONE_VERIFICATION_COOKIE)?.value;
  const verification = verifySignedToken<PhoneVerification>(
    token,
    getVerificationSecret()
  );
  return verification?.phone === normalizePhone(phone);
}

export function phoneStorageKey(phone: string) {
  return createHash("sha256").update(normalizePhone(phone)).digest("hex").slice(0, 32);
}

export const phoneVerificationCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: PHONE_VERIFICATION_SECONDS,
};
