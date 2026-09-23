import { NextResponse } from "next/server";
import { z } from "zod";
import { twilioClient, twilioVerifyServiceSid } from "@/lib/twilio";
import { normalizePhone } from "@/lib/security/phone-verification";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

const phoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

export async function POST(req: Request) {
  try {
    const rejected =
      rejectCrossOrigin(req) || rejectOversizedRequest(req, 4 * 1024);
    if (rejected) return rejected;

    const parsed = phoneSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Enter a valid phone number." },
        { status: 400 }
      );
    }

    const phone = normalizePhone(parsed.data.phone);
    const limited = rateLimit(
      `otp-send:${getClientIp(req)}:${phone}`,
      5,
      30 * 60 * 1000
    );
    if (limited) return limited;

    await twilioClient.verify.v2
      .services(twilioVerifyServiceSid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully.",
    });
  } catch (error) {
    console.error("SEND_OTP_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to send verification code." },
      { status: 500 }
    );
  }
}
