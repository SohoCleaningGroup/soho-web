import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSignedToken<T extends object>(
  value: T,
  secret: string,
  ttlSeconds: number
) {
  const payload = encode(
    JSON.stringify({ ...value, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  );
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySignedToken<T extends { exp: number }>(
  token: string | undefined,
  secret: string
): T | null {
  if (!token) return null;

  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;

  const expectedSignature = signature(payload, secret);
  const actual = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(payload)) as T;
    if (!parsed.exp || parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
