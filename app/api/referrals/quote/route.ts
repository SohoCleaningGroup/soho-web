import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteReferral, ReferralError } from "@/lib/referrals/service";
import { calculateCleaningPrice } from "@/lib/pricing/cleaning-pricing";
import { getClientIp, rateLimit, rejectCrossOrigin, rejectOversizedRequest } from "@/lib/security/request";

const schema = z.object({
  referralCode: z.string().trim().min(1).max(60), email: z.email().max(254), phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  address: z.string().min(3).max(200), apartment: z.string().max(50), zipCode: z.string().max(10),
  cleaningType: z.enum(["SOHO_SIGNATURE", "SOHO_SIGNATURE_DEEP", "MOVE_IN_MOVE_OUT", "RECURRING"]),
  homeSize: z.enum(["1BHK", "2BHK", "3BHK", "4BHK"]), totalSqft: z.coerce.number().int().min(100).max(20000),
  frequency: z.enum(["WEEKLY", "BI_WEEKLY", "MONTHLY", "ONE_TIME"]).optional(),
});
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request, 4096) || rateLimit(`referral-quote:${getClientIp(request)}`, 20);
  if (rejected) return rejected;
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Complete your contact, address, and service details before applying a code." }, { status: 400 });
    const body = parsed.data;
    const pricing = calculateCleaningPrice(body);
    const quote = await quoteReferral(body.referralCode, body, pricing.total);
    return NextResponse.json({ success: true, ...quote });
  } catch (error) {
    if (error instanceof ReferralError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    console.error("REFERRAL_QUOTE_ERROR", error);
    return NextResponse.json({ success: false, message: "Unable to check this code. Please try again." }, { status: 500 });
  }
}
