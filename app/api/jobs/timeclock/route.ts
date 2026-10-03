import { NextResponse } from "next/server";
import { clockWorker } from "@/lib/timeclock/service";
import { getClientIp, rateLimit, rejectCrossOrigin, rejectOversizedRequest } from "@/lib/security/request";
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request, 8192) || rateLimit(`clock:${getClientIp(request)}`, 40);
  if (rejected) return rejected;
  try {
    const { token, action, location, timecardId } = await request.json();
    if (typeof token !== "string" || typeof action !== "string" || (timecardId !== undefined && typeof timecardId !== "string")) throw new Error("Invalid request.");
    await clockWorker(token, action, location, timecardId);
    return NextResponse.json({ success: true, message: action === "in" ? "Clock-in saved." : "Clock-out saved. Your hours are ready for review." });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unable to save time." }, { status: 400 });
  }
}
