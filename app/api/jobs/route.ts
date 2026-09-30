import { NextResponse } from "next/server";
import { rateLimit, rejectCrossOrigin, rejectOversizedRequest, getClientIp } from "@/lib/security/request";
import { requestCustomerReview, respondCustomer, respondWorker } from "@/lib/jobs/service";
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request) || rateLimit(`job:${getClientIp(request)}`, 30);
  if (rejected) return rejected;
  try {
    const { token, action, note } = await request.json();
    if (typeof token !== "string" || typeof action !== "string") throw new Error("Invalid request.");
    if (action === "review") {
      const result = await requestCustomerReview(token);
      return NextResponse.json({ success: true, message: result.emailSent ? "Customer review email sent." : "The email was not accepted. Try again.", ...result });
    }
    if (action === "accept" || action === "decline") await respondWorker(token, action);
    else await respondCustomer(token, action, typeof note === "string" ? note : "");
    return NextResponse.json({ success: true, message: "Response saved." });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unable to save response." }, { status: 400 });
  }
}
