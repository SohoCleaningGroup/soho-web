import { NextResponse } from "next/server";
import { z } from "zod";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { getClientIp, rateLimit } from "@/lib/security/request";
import { resendPayNotice, PayNoticeError } from "@/lib/cleaner-pay-notice-service";
export async function POST(request: Request) {
  const rejected = await rejectUnauthorizedAdminRequest(request) || rateLimit(`pay-notice-resend:${getClientIp(request)}`, 10);
  if (rejected) return rejected;
  const body = z.object({ id: z.string().min(1).max(100) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Choose a notice." }, { status: 400 });
  try { return NextResponse.json({ success: true, ...await resendPayNotice(body.data.id) }); }
  catch (error) {
    console.error("PAY_NOTICE_RESEND_ERROR", error);
    return NextResponse.json({ message: error instanceof PayNoticeError ? error.message : "Unable to resend this notice." }, { status: error instanceof PayNoticeError ? 409 : 500 });
  }
}
