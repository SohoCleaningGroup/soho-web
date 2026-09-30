import { sendEmail } from "@/lib/sendgrid";
import {
  getAdminNewBookingSmsBody,
  sendSms,
} from "@/lib/twilio";

type NewBookingAdminNotification = {
  bookingId: string;

  customer: {
    fullName: string;
    email: string;
    phone: string;

    address?: string | null;
    apartment?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  };

  cleaningType: string;
  homeSize: string;

  bedrooms?: number | null;
  bathrooms?: number | null;
  kitchens?: number | null;

  hasPets: boolean;

  selectedAddOns: string[];
  addOnTotal: number;

  preferredDate?: Date | null;
  preferredTime?: string | null;

  frequency: string;

  specialNotes?: string | null;

  authorizedAmount: number;
  currency: string;
};

const addOnLabels: Record<string, string> = {
  INSIDE_FRIDGE: "Inside Fridge Cleaning",
};

export async function notifyAdminsOfNewBooking(
  booking: NewBookingAdminNotification
) {
  const adminPhones = parseRecipients(
    process.env.ADMIN_NOTIFICATION_PHONES
  );

  const adminEmails = parseRecipients(
    process.env.ADMIN_NOTIFICATION_EMAILS
  );

  if (adminPhones.length === 0 && adminEmails.length === 0) {
    console.warn("ADMIN_NOTIFICATION_RECIPIENTS_NOT_CONFIGURED");
    return;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const bookingUrl = `${appUrl}/admin/dashboard/bookings/${booking.bookingId}`;

  const bookingDate = booking.preferredDate
    ? booking.preferredDate.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not selected";

  const bookingTime =
    booking.preferredTime || "Not selected";

  const serviceLabel = formatLabel(
    booking.cleaningType
  );

  const currency = booking.currency.toUpperCase();

  const smsBody = getAdminNewBookingSmsBody({
    customerName: booking.customer.fullName,
    service: serviceLabel,
    date: bookingDate,
    time: bookingTime,
    amount: booking.authorizedAmount,
    currency,
    bookingUrl,
  });

  /*
   * Send all SMS notifications independently.
   * One bad recipient should not stop notifications to the others.
   */
  const smsResults = await Promise.allSettled(
    adminPhones.map((phone) =>
      sendSms({
        to: phone,
        body: smsBody,
      })
    )
  );

  const emailSent =
    adminEmails.length > 0
      ? await sendEmail({
          to: adminEmails,
          subject: `New Booking — ${booking.customer.fullName} — ${bookingDate}`,
          text: getAdminBookingEmailText({
            booking,
            bookingDate,
            bookingTime,
            serviceLabel,
            bookingUrl,
          }),
          html: getAdminBookingEmailHtml({
            booking,
            bookingDate,
            bookingTime,
            serviceLabel,
            bookingUrl,
          }),
        })
      : null;

  console.log("ADMIN_NEW_BOOKING_NOTIFICATION_RESULT", {
    bookingId: booking.bookingId,
    smsRecipients: adminPhones.length,
    smsResults: smsResults.map((result) =>
      result.status === "fulfilled"
        ? result.value
        : false
    ),
    emailRecipients: adminEmails.length,
    emailSent,
  });
}


type CancelledBookingAdminNotification = Pick<
  NewBookingAdminNotification,
  "bookingId" | "customer" | "cleaningType" | "preferredDate" | "preferredTime"
>;

export async function notifyAdminsOfCancelledBooking(
  booking: CancelledBookingAdminNotification
): Promise<boolean> {
  const adminEmails = parseRecipients(process.env.ADMIN_NOTIFICATION_EMAILS);
  if (adminEmails.length === 0) {
    console.warn("ADMIN_CANCELLATION_RECIPIENTS_NOT_CONFIGURED");
    return false;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const bookingUrl = `${appUrl}/admin/dashboard/bookings/${booking.bookingId}`;
  const date = booking.preferredDate
    ? booking.preferredDate.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not selected";
  const text = [
    "SoHo Cleaning Group booking cancelled",
    `Booking: ${booking.bookingId}`,
    `Customer: ${booking.customer.fullName}`,
    `Email: ${booking.customer.email}`,
    `Phone: ${booking.customer.phone}`,
    `Address: ${formatAddress(booking.customer)}`,
    `Service: ${formatLabel(booking.cleaningType)}`,
    `Date: ${date}`,
    `Time: ${booking.preferredTime || "Not selected"}`,
    "",
    `View booking: ${bookingUrl}`,
  ].join("\n");

  try {
    const emailSent = await sendEmail({
      to: adminEmails,
      subject: `Booking Cancelled — ${booking.customer.fullName} — ${date}`,
      text,
      html: `<div style="font-family:Arial,sans-serif"><h1>Booking Cancelled</h1><p>${escapeHtml(text).replaceAll("\n", "<br>")}</p><a href="${escapeHtml(bookingUrl)}">View Booking</a></div>`,
    });
    console.log("ADMIN_BOOKING_CANCELLED_NOTIFICATION_RESULT", {
      bookingId: booking.bookingId,
      emailRecipients: adminEmails.length,
      emailSent,
    });
    return emailSent;
  } catch (error) {
    console.error("ADMIN_BOOKING_CANCELLED_NOTIFICATION_ERROR", {
      bookingId: booking.bookingId,
      error,
    });
    return false;
  }
}

function parseRecipients(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAdminBookingEmailText({
  booking,
  bookingDate,
  bookingTime,
  serviceLabel,
  bookingUrl,
}: {
  booking: NewBookingAdminNotification;
  bookingDate: string;
  bookingTime: string;
  serviceLabel: string;
  bookingUrl: string;
}) {
  const address = formatAddress(booking.customer);

  const addOns = booking.selectedAddOns.length
    ? booking.selectedAddOns
        .map(
          (addOn) =>
            addOnLabels[addOn] || formatLabel(addOn)
        )
        .join(", ")
    : "None";

  return `New SoHo Cleaning Group booking

Customer
${booking.customer.fullName}
${booking.customer.email}
${booking.customer.phone}

Address
${address}

Cleaning
Service: ${serviceLabel}
Home Size: ${booking.homeSize.replace(/(\d+)\s*BHK/gi, "$1 BR")}
Bedrooms: ${booking.bedrooms ?? 0}
Bathrooms: ${booking.bathrooms ?? 0}
Kitchen: ${booking.kitchens ?? 0}
Pets: ${booking.hasPets ? "Yes" : "No"}
Frequency: ${formatLabel(booking.frequency)}
Add-ons: ${addOns}

Schedule
Date: ${bookingDate}
Time: ${bookingTime}

Payment
Authorized Amount: ${formatCurrency(
    booking.authorizedAmount,
    booking.currency
  )}

Special Notes
${booking.specialNotes || "None"}

View Booking
${bookingUrl}`;
}

function getAdminBookingEmailHtml({
  booking,
  bookingDate,
  bookingTime,
  serviceLabel,
  bookingUrl,
}: {
  booking: NewBookingAdminNotification;
  bookingDate: string;
  bookingTime: string;
  serviceLabel: string;
  bookingUrl: string;
}) {
  const address = escapeHtml(
    formatAddress(booking.customer)
  );

  const addOns = booking.selectedAddOns.length
    ? booking.selectedAddOns
        .map(
          (addOn) =>
            addOnLabels[addOn] || formatLabel(addOn)
        )
        .join(", ")
    : "None";

  return `
    <div style="margin:0;background:#f6f6f4;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#171717;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e2da;border-radius:18px;overflow:hidden;">
        
        <div style="background:#0a0a0a;padding:28px 32px;">
          <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d6ab5f;">
            SoHo Cleaning Group
          </div>

          <h1 style="margin:10px 0 0;color:#ffffff;font-size:28px;font-weight:500;">
            New Booking Received
          </h1>
        </div>

        <div style="padding:32px;">
          <p style="margin-top:0;font-size:18px;">
            <strong>${escapeHtml(
              booking.customer.fullName
            )}</strong> has completed a new cleaning booking.
          </p>

          ${emailSection("Customer", [
            ["Name", booking.customer.fullName],
            ["Email", booking.customer.email],
            ["Phone", booking.customer.phone],
            ["Address", address],
          ])}

          ${emailSection("Cleaning Details", [
            ["Service", serviceLabel],
            ["Home Size", booking.homeSize.replace(/(\d+)\s*BHK/gi, "$1 BR")],
            ["Bedrooms", String(booking.bedrooms ?? 0)],
            ["Bathrooms", String(booking.bathrooms ?? 0)],
            ["Kitchen", String(booking.kitchens ?? 0)],
            ["Pets", booking.hasPets ? "Yes" : "No"],
            ["Frequency", formatLabel(booking.frequency)],
            ["Add-ons", addOns],
          ])}

          ${emailSection("Schedule", [
            ["Date", bookingDate],
            ["Time", bookingTime],
          ])}

          ${emailSection("Payment", [
            [
              "Authorized Amount",
              formatCurrency(
                booking.authorizedAmount,
                booking.currency
              ),
            ],
            ["Status", "Authorized — Not Yet Captured"],
          ])}

          ${emailSection("Special Notes", [
            [
              "Notes",
              booking.specialNotes || "No special notes",
            ],
          ])}

          <div style="margin-top:30px;">
            <a
              href="${escapeHtml(bookingUrl)}"
              style="display:inline-block;background:#d6ab5f;color:#000000;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700;"
            >
              View Booking
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function emailSection(
  title: string,
  rows: Array<[string, string]>
) {
  return `
    <div style="margin-top:28px;">
      <h2 style="margin:0 0 14px;font-size:16px;color:#8f6b2f;">
        ${escapeHtml(title)}
      </h2>

      <table style="width:100%;border-collapse:collapse;">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding:8px 0;width:170px;color:#777777;vertical-align:top;">
                  ${escapeHtml(label)}
                </td>
                <td style="padding:8px 0;color:#171717;">
                  ${escapeHtml(value)}
                </td>
              </tr>
            `
          )
          .join("")}
      </table>
    </div>
  `;
}

function formatAddress(
  customer: NewBookingAdminNotification["customer"]
) {
  const street = [
    customer.address,
    customer.apartment,
  ]
    .filter(Boolean)
    .join(", ");

  const cityStateZip = [
    customer.city,
    customer.state,
    customer.zipCode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    [street, cityStateZip]
      .filter(Boolean)
      .join(" — ") || "Not provided"
  );
}

function formatCurrency(
  amount: number,
  currency: string
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount);
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}