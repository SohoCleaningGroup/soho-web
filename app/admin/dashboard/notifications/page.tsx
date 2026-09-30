import { redirect } from "next/navigation";
import { hasValidAdminSession } from "@/lib/security/admin-auth";
import { sendEmail } from "@/lib/sendgrid";

async function sendTestEmail() {
  "use server";
  if (!(await hasValidAdminSession())) redirect("/admin/login");
  if (process.env.VERCEL_ENV !== "preview") throw new Error("Test emails are available only in staging.");
  const recipients = (process.env.ADMIN_NOTIFICATION_EMAILS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (recipients.length !== 1 || recipients[0] !== "hello@sohocleaninggroup.com") throw new Error("The staging owner recipient must be configured first.");
  const sent = await sendEmail({
    to: recipients,
    subject: "TEST — SoHo Cleaning Group owner email delivery",
    text: "This is a test email from the SoHo Cleaning Group replacement test website. Owner alerts for new bookings and cancellations are configured for this address. No booking was created or cancelled, and no payment was made. This message checks email delivery only.",
    html: "<h1>SoHo Cleaning Group — Test Email</h1><p>This is a test email from your replacement test website.</p><p>Owner alerts for new bookings and cancellations are configured for this address.</p><p>No booking was created or cancelled, and no payment was made. This message checks email delivery only.</p>",
  });
  redirect(`/admin/dashboard/notifications?result=${sent ? "accepted" : "failed"}`);
}

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  if (!(await hasValidAdminSession())) redirect("/admin/login");
  if (process.env.VERCEL_ENV !== "preview") redirect("/admin/dashboard");
  const { result } = await searchParams;
  return <main style={{ padding: 32 }}>
    <h1>Owner Email Test</h1>
    <p>Send a labeled test email to hello@sohocleaninggroup.com. This does not change any bookings or payments.</p>
    {result === "accepted" && <p role="status">SendGrid accepted the test email. Check your inbox and spam folder.</p>}
    {result === "failed" && <p role="alert">The email was not accepted. Check the staging email configuration.</p>}
    <form action={sendTestEmail}><button type="submit">Send Test Email</button></form>
  </main>;
}
