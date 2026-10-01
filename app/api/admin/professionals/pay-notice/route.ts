import { NextResponse } from "next/server";
import { z } from "zod";
import { payNoticeInputSchema } from "@/lib/cleaner-pay-notice";
import { issuePayNotice, preparePayNotice, PayNoticeError } from "@/lib/cleaner-pay-notice-service";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { getClientIp, rateLimit } from "@/lib/security/request";

const schema = payNoticeInputSchema.extend({ action: z.enum(["preview", "send"]), requestId: z.string().uuid().optional(), expectedHash: z.string().regex(/^[a-f0-9]{64}$/).optional() });
export async function POST(request: Request) {
  const rejected = await rejectUnauthorizedAdminRequest(request);
  if (rejected) return rejected;
  const limited = rateLimit(`pay-notice-admin:${getClientIp(request)}`, 20);
  if (limited) return limited;
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Complete the language, effective date, rates, and preparer details." }, { status: 400 });
  try {
    if (body.data.action === "preview") {
      const result = await preparePayNotice(body.data);
      return NextResponse.json({ snapshot: result.snapshot, hash: result.hash });
    }
    if (!body.data.expectedHash || !body.data.requestId) return NextResponse.json({ message: "Review the notice before sending." }, { status: 400 });
    const result = await issuePayNotice(body.data, body.data.expectedHash, body.data.requestId);
    return NextResponse.json({ success: true, ...result, message: result.emailSent ? "Pay notice email sent. Waiting for the cleaner’s acknowledgment." : "Notice saved, but the email was not sent. Copy the private signing link below or try again." });
  } catch (error) {
    console.error("PAY_NOTICE_ADMIN_ERROR", error);
    return NextResponse.json({ message: error instanceof PayNoticeError ? error.message : "Unable to prepare this notice." }, { status: error instanceof PayNoticeError ? 409 : 500 });
  }
}
