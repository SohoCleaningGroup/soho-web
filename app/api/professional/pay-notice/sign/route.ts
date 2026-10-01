import { NextResponse } from "next/server";
import { z } from "zod";
import { signPayNotice, PayNoticeError } from "@/lib/cleaner-pay-notice-service";
import { getClientIp, rejectCrossOrigin, rejectOversizedRequest, rateLimit } from "@/lib/security/request";
const schema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/), name: z.string().trim().min(2).max(120), primaryLanguage: z.enum(["en", "es"]), hash: z.string().regex(/^[a-f0-9]{64}$/), agreed: z.literal(true) });
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request, 4096) || rateLimit(`pay-notice-sign:${getClientIp(request)}`, 15);
  if (rejected) return rejected;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Enter your name, confirm your primary language, and acknowledge receipt." }, { status: 400 });
  try {
    const result = await signPayNotice(body.data.token, body.data.name, body.data.primaryLanguage, body.data.hash, getClientIp(request), request.headers.get("user-agent") || "");
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("PAY_NOTICE_SIGN_ERROR", error);
    return NextResponse.json({ message: error instanceof PayNoticeError ? error.message : "Unable to acknowledge this notice." }, { status: error instanceof PayNoticeError ? 409 : 500 });
  }
}
