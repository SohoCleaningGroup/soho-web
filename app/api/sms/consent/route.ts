import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PUBLIC_SMS_CONSENT_VERSION, PUBLIC_SMS_DISCLOSURE, publicConsentSchema } from "@/lib/messaging/public-sms-consent";
import { consentSessionToken, SMS_CONSENT_COOKIE, SMS_CONSENT_SESSION_SECONDS } from "@/lib/security/sms-consent-session";
import { getClientIp, rateLimit, rejectCrossOrigin, rejectOversizedRequest } from "@/lib/security/request";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request, 4096) || rateLimit(`sms-consent:${getClientIp(request)}`, 10);
  if (rejected) return rejected;
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 4096) return NextResponse.json({ success: false, message: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid form submission." }, { status: 400 });
  }
  const parsed = publicConsentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, message: "Enter your name, valid email, and US mobile number." }, { status: 400 });
  try {
    // Prepare the signed session before writing so a missing secret cannot leave a partial success.
    const id = crypto.randomUUID();
    const token = consentSessionToken(id);
    await prisma.smsConsentRecord.create({ data: { id, ...parsed.data, version: PUBLIC_SMS_CONSENT_VERSION, disclosure: PUBLIC_SMS_DISCLOSURE, source: "/sms-consent" } });
    const response = NextResponse.json({ success: true, accepted: parsed.data.accepted }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SMS_CONSENT_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SMS_CONSENT_SESSION_SECONDS });
    return response;
  } catch {
    console.error("SMS_CONSENT_SAVE_FAILED");
    return NextResponse.json({ success: false, message: "We could not save your choice. Please try again." }, { status: 503 });
  }
}
