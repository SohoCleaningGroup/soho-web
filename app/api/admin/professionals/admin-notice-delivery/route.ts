import { NextResponse } from "next/server";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

const subject = "New cleaner application — SoHo Cleaning Group";

export async function POST(request: Request) {
  const rejected = await rejectUnauthorizedAdminRequest(request);
  if (rejected) return rejected;

  const key = process.env.SENDGRID_API_KEY;
  const recipient = (process.env.ADMIN_NOTIFICATION_EMAILS || "").split(",").map(value => value.trim()).find(Boolean);
  if (!key || !recipient) return NextResponse.json({ success: false, message: "Admin email delivery settings are incomplete." }, { status: 503 });

  try {
    const response = await fetch("https://api.sendgrid.com/v3/logs", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: `to_email = "${recipient.replaceAll('"', '')}" AND subject = "${subject}"`, limit: 10 }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    if (response.status === 403) return NextResponse.json({ success: false, message: "The SendGrid key cannot read email logs. Check Email Activity in SendGrid." }, { status: 502 });
    if (!response.ok) {
      console.error("SENDGRID_ADMIN_NOTICE_LOG_STATUS", response.status);
      return NextResponse.json({ success: false, message: "SendGrid could not return delivery events. Check Email Activity in SendGrid." }, { status: 502 });
    }
    const data = await response.json() as { messages?: Array<{ to_email?: string; subject?: string; status?: string; reason?: string; sg_message_id_created_at?: string }> };
    const messages = (data.messages || []).filter(item => item.to_email?.toLowerCase() === recipient.toLowerCase() && item.subject === subject)
      .map(item => ({ to: item.to_email, status: item.status || "unknown", reason: item.reason?.slice(0, 300) || "", at: item.sg_message_id_created_at || "" }))
      .sort((a, b) => b.at.localeCompare(a.at));
    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("SENDGRID_ADMIN_NOTICE_LOG_ERROR", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ success: false, message: "Could not check SendGrid delivery events right now." }, { status: 502 });
  }
}
