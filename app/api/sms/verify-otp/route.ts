import { NextResponse } from "next/server";
import { z } from "zod";
import { twilioClient, twilioVerifyServiceSid } from "@/lib/twilio";
import {
  PHONE_VERIFICATION_COOKIE,
  createPhoneVerificationToken,
  normalizePhone,
  phoneVerificationCookieOptions,
} from "@/lib/security/phone-verification";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

const verificationSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  code: z.string().regex(/^\d{4,10}$/),
});

export async function POST(req: Request) {
  try {
    const rejected =
      rejectCrossOrigin(req) || rejectOversizedRequest(req, 4 * 1024);
    if (rejected) return rejected;

    const parsed = verificationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid verification request." },
        { status: 400 }
      );
    }

    const phone = normalizePhone(parsed.data.phone);
    const limited = rateLimit(
      `otp-verify:${getClientIp(req)}:${phone}`,
      10,
      30 * 60 * 1000
    );
    if (limited) return limited;

    const verification = await twilioClient.verify.v2
      .services(twilioVerifyServiceSid)
      .verificationChecks.create({
        to: phone,
        code: parsed.data.code,
      });

    if (verification.status !== "approved") {
      return NextResponse.json(
        { success: false, message: "Invalid verification code." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Phone verified successfully.",
    });

    response.cookies.set({
      name: PHONE_VERIFICATION_COOKIE,
      value: createPhoneVerificationToken(phone),
      ...phoneVerificationCookieOptions,
    });

    return response;
  } catch (error) {
    console.error("VERIFY_OTP_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Failed to verify phone." },
      { status: 500 }
    );
  }
}
