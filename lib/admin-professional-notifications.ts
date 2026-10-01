import { sendEmail } from "@/lib/sendgrid";

export async function notifyAdminsOfProfessionalApplication({
  applicationId,
  reviewUrl,
}: {
  applicationId: string;
  reviewUrl: string;
}) {
  const recipients = (process.env.ADMIN_NOTIFICATION_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    console.warn("ADMIN_PROFESSIONAL_EMAIL_RECIPIENTS_NOT_CONFIGURED");
    return false;
  }

  const sent = await sendEmail({
    to: recipients,
    subject: "New cleaner application — SoHo Cleaning Group",
    text: `A cleaner application has been submitted. Sign in to review it: ${reviewUrl}`,
    html: `<p>A cleaner application has been submitted.</p><p><a href="${reviewUrl}">Sign in to review the application</a></p>`,
  });

  console.log("ADMIN_PROFESSIONAL_APPLICATION_EMAIL_RESULT", {
    applicationId,
    recipients: recipients.length,
    sent,
  });
  return sent;
}
