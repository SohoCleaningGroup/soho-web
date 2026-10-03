import { NextResponse } from "next/server";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { reviewTimecard, setJobLocation } from "@/lib/timeclock/service";
export async function POST(request: Request) {
  const rejected = await rejectUnauthorizedAdminRequest(request);
  if (rejected) return rejected;
  try {
    const body = await request.json();
    if (body.action === "site") {
      if (typeof body.assignmentId !== "string" || typeof body.latitude !== "number" || typeof body.longitude !== "number" || typeof body.radius !== "number") throw new Error("Invalid job location.");
      await setJobLocation(body.assignmentId, body.latitude, body.longitude, body.radius);
    } else {
      if (typeof body.id !== "string" || typeof body.action !== "string" || typeof body.revision !== "number" || typeof body.note !== "string" ||
          (body.startAt !== undefined && typeof body.startAt !== "string") || (body.endAt !== undefined && typeof body.endAt !== "string")) throw new Error("Invalid review request.");
      await reviewTimecard(body.id, body.revision, body.action, body.note, body.startAt, body.endAt);
    }
    return NextResponse.json({ success: true, message: "Saved." });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Unable to save review." }, { status: 400 });
  }
}
