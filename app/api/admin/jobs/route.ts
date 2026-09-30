import { NextResponse } from "next/server";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { inviteWorker } from "@/lib/jobs/service";
export async function POST(request: Request) {
  const rejected = await rejectUnauthorizedAdminRequest(request); if (rejected) return rejected;
  try {
    const { bookingId, professionalId } = await request.json();
    if (typeof bookingId !== "string" || typeof professionalId !== "string") throw new Error("Choose a booking and worker.");
    const result = await inviteWorker(bookingId, professionalId);
    return NextResponse.json({ success: true, message: result.emailSent ? "Worker invitation emailed." : "Assignment saved but email was not accepted. Retry the invitation.", ...result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unable to assign worker." }, { status: 400 });
  }
}
