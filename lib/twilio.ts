import twilio from "twilio";

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const twilioVerifyServiceSid =
  process.env.TWILIO_VERIFY_SERVICE_SID!;

export const twilioMessagingServiceSid =
  process.env.TWILIO_MESSAGING_SERVICE_SID!;

export function isPreviewSmsRecipientAllowed(to: string) {
  if (process.env.VERCEL_ENV !== "preview") return true;

  const allowed = (process.env.STAGING_SMS_ALLOWED_NUMBERS ?? "")
    .split(/[\s,]+/)
    .filter(Boolean);

  return allowed.includes(to);
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  if (!isPreviewSmsRecipientAllowed(to)) {
    console.warn("TWILIO_SMS_BLOCKED_PREVIEW");
    return false;
  }

  try {
    const message = await twilioClient.messages.create({
      messagingServiceSid: twilioMessagingServiceSid,
      to,
      body,
    });

    console.log("TWILIO_SMS_ACCEPTED", {
      sid: message.sid,
      status: message.status,
      to,
      body,
    });

    return true;
  } catch (error) {
    console.error("TWILIO_SMS_ERROR", error);
    return false;
  }
}

export function getBookingCreatedSmsBody({
  date,
  time,
}: {
  date: string;
  time: string;
}) {
  return `SoHo Cleaning Group: Your cleaning is reserved for ${date} at ${time}. Your card has been authorized but not charged. Payment will be captured after the cleaning is completed.`;
}

export function getAdminNewBookingSmsBody({
  customerName,
  service,
  date,
  time,
  amount,
  currency = "USD",
  bookingUrl,
}: {
  customerName: string;
  service: string;
  date: string;
  time: string;
  amount: number;
  currency?: string;
  bookingUrl: string;
}) {
  return `SoHo Cleaning Group: New booking received.

Customer: ${customerName}
Service: ${service}
Date: ${date}
Time: ${time}
Authorized: ${formatCurrency(amount, currency)}

View booking: ${bookingUrl}`;
}

export function getPaymentCapturedSmsBody({
  amount,
  currency = "USD",
}: {
  amount: number;
  currency?: string;
}) {
  return `SoHo Cleaning Group: Your cleaning payment of ${formatCurrency(
    amount,
    currency
  )} has been successfully charged. Thank you for choosing SoHo Cleaning Group.`;
}

export function getAdditionalAuthorizationSmsBody({
  additionalAmount,
  finalAmount,
  reason,
  authorizationLink,
  expiresInHours = 24,
}: {
  additionalAmount: number;
  finalAmount: number;
  reason?: string;
  authorizationLink: string;
  expiresInHours?: number;
}) {
  const reasonText = reason ? ` Reason: ${reason}.` : "";

  return `SoHo Cleaning Group: An additional card authorization of ${formatCurrency(
    additionalAmount,
    "USD"
  )} is required for your updated cleaning total of ${formatCurrency(
    finalAmount,
    "USD"
  )}.${reasonText} Review and authorize securely within ${expiresInHours} hours: ${authorizationLink}`;
}

export function getAdditionalAuthorizationCompletedSmsBody({
  amount,
  currency = "USD",
}: {
  amount: number;
  currency?: string;
}) {
  return `SoHo Cleaning Group: Your additional card authorization of ${formatCurrency(
    amount,
    currency
  )} was completed successfully. This amount has not been charged yet and will be captured after your cleaning is completed.`;
}

export function getProfessionalApplicationReceivedSmsBody() {
  return "SoHo Cleaning Group: We have received your professional application. Our team will review your profile and documents and contact you shortly.";
}

export function getBookingStatusSmsBody(status: string) {
  const messages: Record<string, string> = {
    PENDING:
      "SoHo Cleaning Group: Your booking is pending review. We will update you shortly.",

    CONFIRMED:
      "SoHo Cleaning Group: Your booking has been confirmed. A cleaning professional will be assigned soon.",

    ASSIGNED:
      "SoHo Cleaning Group: A cleaning professional has been assigned to your booking.",

    COMPLETED:
      "SoHo Cleaning Group: Your cleaning service has been marked as completed. Thank you for choosing SoHo Cleaning Group.",

    CANCELLED:
      "SoHo Cleaning Group: Your booking has been cancelled and any active card authorization has been released. Your bank may take some time to remove the pending hold.",
  };

  return (
    messages[status] ||
    `SoHo Cleaning Group: Your booking status has been updated to ${status}.`
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}