import "server-only";

import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";

export const CHECKOUT_RETURN_COOKIE = "soho_checkout_return";
export const checkoutReturnCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60,
};

function secret() {
  const value = process.env.PHONE_VERIFICATION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("Checkout return secret is not configured.");
  return `checkout-return:${value}`;
}

export function createCheckoutReturnToken(sessionId: string) {
  return createSignedToken({ sessionId }, secret(), checkoutReturnCookieOptions.maxAge);
}

export function readCheckoutReturnToken(token: string | undefined) {
  return verifySignedToken<{ sessionId: string; exp: number }>(token, secret());
}
