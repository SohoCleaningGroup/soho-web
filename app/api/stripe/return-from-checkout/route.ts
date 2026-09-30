import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  CHECKOUT_RETURN_COOKIE,
  checkoutReturnCookieOptions,
  readCheckoutReturnToken,
} from "@/lib/security/checkout-return";
import { getClientIp, rateLimit, rejectCrossOrigin } from "@/lib/security/request";

export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rateLimit(`checkout-return:${getClientIp(request)}`, 20);
  if (rejected) return rejected;

  try {
    const token = readCheckoutReturnToken((await cookies()).get(CHECKOUT_RETURN_COOKIE)?.value);
    if (!token) return NextResponse.json({ success: true, status: "none" });

    let session = await stripe.checkout.sessions.retrieve(token.sessionId);
    if (session.status === "open") {
      try {
        session = await stripe.checkout.sessions.expire(session.id);
      } catch {
        // A payment may have completed, or the session expired, concurrently.
        session = await stripe.checkout.sessions.retrieve(token.sessionId);
        if (session.status === "open") throw new Error("Checkout is still open.");
      }
    }

    // Never release a completed payment's reservation. Its webhook owns it.
    if (session.status === "expired") {
      await prisma.bookingSlotHold.deleteMany({ where: { checkoutSessionId: session.id } });
    }

    const response = NextResponse.json({ success: true, status: session.status });
    response.cookies.set(CHECKOUT_RETURN_COOKIE, "", { ...checkoutReturnCookieOptions, maxAge: 0 });
    return response;
  } catch (error) {
    console.error("CHECKOUT_RETURN_ERROR", error);
    return NextResponse.json({ success: false, message: "Unable to close the previous checkout. Please try again." }, { status: 500 });
  }
}
