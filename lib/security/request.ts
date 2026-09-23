import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_RATE_LIMIT_BUCKETS = 10_000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function pruneRateLimitBuckets(now: number) {
  if (rateLimitBuckets.size < MAX_RATE_LIMIT_BUCKETS) return;

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }

  while (rateLimitBuckets.size >= MAX_RATE_LIMIT_BUCKETS) {
    const oldestKey = rateLimitBuckets.keys().next().value;
    if (typeof oldestKey !== "string") break;
    rateLimitBuckets.delete(oldestKey);
  }
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return request.headers.get("sec-fetch-site") !== "cross-site";
  }

  try {
    const requestUrl = new URL(request.url);
    const originUrl = new URL(origin);
    const expectedHost =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      requestUrl.host;
    const expectedProtocol =
      request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1);
    return (
      expectedHost === originUrl.host && `${expectedProtocol}:` === originUrl.protocol
    );
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return NextResponse.json(
    { success: false, message: "Invalid request origin." },
    { status: 403 }
  );
}

export function rejectOversizedRequest(request: Request, maxBytes = 64 * 1024) {
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(
      { success: false, message: "Request is too large." },
      { status: 413 }
    );
  }
  return null;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs = RATE_LIMIT_WINDOW_MS
) {
  const now = Date.now();
  pruneRateLimitBuckets(now);
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return NextResponse.json(
    { success: false, message: "Too many requests. Please try again later." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
