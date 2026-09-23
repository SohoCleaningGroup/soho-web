import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { rejectCrossOrigin, rejectOversizedRequest } from "@/lib/security/request";
import { createSignedToken, verifySignedToken } from "@/lib/security/signed-token";

export const ADMIN_SESSION_COOKIE = "soho_admin_session";
const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

type AdminSession = {
  role: "admin";
  nonce: string;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function secureStringEqual(left: string, right: string) {
  return timingSafeEqual(digest(left), digest(right));
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET must be at least 32 characters.");
  }

  return createSignedToken(
    { role: "admin" as const, nonce: randomBytes(16).toString("hex") },
    secret,
    ADMIN_SESSION_SECONDS
  );
}

export async function hasValidAdminSession() {
  const secret = getSessionSecret();
  if (!secret) return false;

  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySignedToken<AdminSession>(token, secret);
  return session?.role === "admin";
}

export async function rejectUnauthorizedAdminRequest(request: Request) {
  const rejected =
    rejectCrossOrigin(request) || rejectOversizedRequest(request, 64 * 1024);
  if (rejected) return rejected;

  if (!(await hasValidAdminSession())) {
    return NextResponse.json(
      { success: false, message: "Unauthorized." },
      { status: 401 }
    );
  }

  return null;
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: ADMIN_SESSION_SECONDS,
};
