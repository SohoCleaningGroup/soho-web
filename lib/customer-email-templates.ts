type EmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

type BookingCreatedEmailParams = {
  customerName: string;
  date: string;
  time: string;
  bookingId: string;
  service: string;
  homeSize: string;
  addOns: string[];
  address: string;
  authorizedAmount: number;
};

type PaymentCapturedEmailParams = {
  customerName: string;
  amount: number;
  currency?: string;
};

type AdditionalAuthorizationRequestedEmailParams = {
  customerName: string;
  additionalAmount: number;
  finalAmount: number;
  reason?: string;
  authorizationLink: string;
  expiresInHours?: number;
};

type AdditionalAuthorizationCompletedEmailParams = {
  customerName: string;
  amount: number;
  currency?: string;
};

type BookingStatusEmailParams = {
  customerName: string;
  status: string;
};

type ProfessionalApplicationReceivedEmailParams = {
  professionalName: string;
};

type ProfessionalDocumentReuploadEmailParams = {
  professionalName: string;
  reuploadUrl: string;
  expiresInDays?: number;
};

/*
 * --------------------------------------------------------------------------
 * Booking created
 * --------------------------------------------------------------------------
 */

export function getBookingCreatedEmail({
  customerName,
  date,
  time,
  bookingId,
  service,
  homeSize,
  addOns,
  address,
  authorizedAmount,
}: BookingCreatedEmailParams): EmailTemplate {
  const subject =
    "Your cleaning is reserved — SoHo Cleaning Group";

  const details: Array<[string, string]> = [
    ["Booking reference", bookingId],
    ["Service", service],
    ["Home", homeSize],
    ["Add-ons", addOns.length ? addOns.join(", ") : "None"],
    ["Service address", address],
    ["Date", date],
    ["Preferred time", time],
    ["Amount authorized", formatCurrency(authorizedAmount, "USD")],
  ];

  const text = `Hi ${customerName},

Your cleaning is reserved. Our team will review the booking and prepare it for scheduling.

Booking details
${details.map(([label, value]) => `${label}: ${value}`).join("\n")}

Your card has been authorized for the booking, but it has not been charged. Payment will be captured after your cleaning is completed.

We’ll keep you updated about your booking by email and text.

Thank you for choosing SoHo Cleaning Group.

SoHo Cleaning Group`;

  const content = `
    ${greeting(customerName)}

    ${paragraph(
      `Your cleaning is reserved for <strong>${escapeHtml(
        date
      )}</strong> at <strong>${escapeHtml(time)}</strong>.`
    )}

    ${emailDetails(details)}

    ${infoBox(`
      <strong>Your card has been authorized, but not charged.</strong><br />
      Payment will be captured after your cleaning is completed.
    `)}

    ${paragraph(
      "We’ll keep you updated about your booking as your service progresses."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Booking Reserved",
      title: "Your cleaning is reserved.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Payment captured
 * --------------------------------------------------------------------------
 */

export function getPaymentCapturedEmail({
  customerName,
  amount,
  currency = "USD",
}: PaymentCapturedEmailParams): EmailTemplate {
  const formattedAmount = formatCurrency(
    amount,
    currency
  );

  const subject =
    "Payment received — SoHo Cleaning Group";

  const text = `Hi ${customerName},

Your cleaning payment of ${formattedAmount} has been successfully charged.

Thank you for choosing SoHo Cleaning Group. We appreciate the opportunity to care for your space.

SoHo Cleaning Group`;

  const content = `
    ${greeting(customerName)}

    ${paragraph(
      `Your cleaning payment of <strong>${escapeHtml(
        formattedAmount
      )}</strong> has been successfully charged.`
    )}

    ${successBox(`
      <strong>Payment complete</strong><br />
      Amount charged: ${escapeHtml(formattedAmount)}
    `)}

    ${paragraph(
      "Thank you for choosing SoHo Cleaning Group. We appreciate the opportunity to care for your space."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Payment Confirmation",
      title: "Payment received.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Additional authorization requested
 * --------------------------------------------------------------------------
 */

export function getAdditionalAuthorizationRequestedEmail({
  customerName,
  additionalAmount,
  finalAmount,
  reason,
  authorizationLink,
  expiresInHours = 24,
}: AdditionalAuthorizationRequestedEmailParams): EmailTemplate {
  const formattedAdditionalAmount =
    formatCurrency(additionalAmount, "USD");

  const formattedFinalAmount =
    formatCurrency(finalAmount, "USD");

  const cleanReason = reason?.trim();

  const subject =
    "Action required: Additional authorization for your cleaning";

  const reasonText = cleanReason
    ? `

Reason:
${cleanReason}`
    : "";

  const text = `Hi ${customerName},

An additional card authorization of ${formattedAdditionalAmount} is required for your updated cleaning total of ${formattedFinalAmount}.${reasonText}

This is an authorization only. The additional amount will not be charged at this time. Payment will be captured after your cleaning is completed.

Please review and authorize securely within ${expiresInHours} hours:

${authorizationLink}

If you have questions about this adjustment, please contact SoHo Cleaning Group before authorizing.

SoHo Cleaning Group`;

  const reasonSection = cleanReason
    ? `
      <div style="margin-top:24px;">
        <div style="margin-bottom:7px;font-size:13px;font-weight:700;color:#8f6b2f;">
          Reason for adjustment
        </div>

        <div style="font-size:15px;line-height:1.7;color:#4a4a4a;white-space:pre-line;">
          ${escapeHtml(cleanReason)}
        </div>
      </div>
    `
    : "";

  const content = `
    ${greeting(customerName)}

    ${paragraph(
      `An additional card authorization of <strong>${escapeHtml(
        formattedAdditionalAmount
      )}</strong> is required for your updated cleaning total of <strong>${escapeHtml(
        formattedFinalAmount
      )}</strong>.`
    )}

    ${emailDetails([
      [
        "Additional authorization",
        formattedAdditionalAmount,
      ],
      ["Updated cleaning total", formattedFinalAmount],
      [
        "Authorization link expires",
        `In ${expiresInHours} hours`,
      ],
    ])}

    ${reasonSection}

    ${infoBox(`
      <strong>This is an authorization, not an immediate charge.</strong><br />
      Payment will be captured after your cleaning is completed.
    `)}

    ${button(
      "Review & Authorize",
      authorizationLink
    )}

    ${paragraph(
      "If you have questions about this adjustment, please contact SoHo Cleaning Group before authorizing."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Action Required",
      title: "Additional authorization needed.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Additional authorization completed
 * --------------------------------------------------------------------------
 */

export function getAdditionalAuthorizationCompletedEmail({
  customerName,
  amount,
  currency = "USD",
}: AdditionalAuthorizationCompletedEmailParams): EmailTemplate {
  const formattedAmount = formatCurrency(
    amount,
    currency
  );

  const subject =
    "Additional authorization completed — SoHo Cleaning Group";

  const text = `Hi ${customerName},

Your additional card authorization of ${formattedAmount} was completed successfully.

This amount has not been charged yet. It will be captured after your cleaning is completed.

No further action is required at this time.

SoHo Cleaning Group`;

  const content = `
    ${greeting(customerName)}

    ${paragraph(
      `Your additional card authorization of <strong>${escapeHtml(
        formattedAmount
      )}</strong> was completed successfully.`
    )}

    ${successBox(`
      <strong>Authorization complete</strong><br />
      Additional amount authorized: ${escapeHtml(
        formattedAmount
      )}
    `)}

    ${infoBox(`
      This amount has <strong>not been charged yet</strong>. It will be captured after your cleaning is completed.
    `)}

    ${paragraph(
      "No further action is required at this time."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Authorization Complete",
      title: "You're all set.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Booking status
 * --------------------------------------------------------------------------
 */

export function getBookingStatusEmail({
  customerName,
  status,
}: BookingStatusEmailParams): EmailTemplate {
  const normalizedStatus = status.toUpperCase();

  const statusContent: Record<
    string,
    {
      subject: string;
      eyebrow: string;
      title: string;
      message: string;
      notice?: string;
    }
  > = {
    PENDING: {
      subject:
        "Booking update — SoHo Cleaning Group",
      eyebrow: "Booking Update",
      title: "Your booking is pending review.",
      message:
        "Your booking is currently pending review. Our team will update you shortly.",
    },

    CONFIRMED: {
      subject:
        "Your cleaning is confirmed — SoHo Cleaning Group",
      eyebrow: "Booking Confirmed",
      title: "Your cleaning is confirmed.",
      message:
        "Your booking has been confirmed. A cleaning professional will be assigned soon.",
    },

    ASSIGNED: {
      subject:
        "Your cleaning professional has been assigned",
      eyebrow: "Professional Assigned",
      title:
        "Your cleaning professional has been assigned.",
      message:
        "A cleaning professional has been assigned to your booking. Your cleaning is moving forward as scheduled.",
    },

    COMPLETED: {
      subject:
        "Your cleaning is complete — SoHo Cleaning Group",
      eyebrow: "Service Completed",
      title: "Your cleaning is complete.",
      message:
        "Your cleaning service has been marked as completed. Thank you for choosing SoHo Cleaning Group.",
    },

    CANCELLED: {
      subject:
        "Your booking has been cancelled — SoHo Cleaning Group",
      eyebrow: "Booking Cancelled",
      title: "Your booking has been cancelled.",
      message:
        "Your booking has been cancelled.",
      notice:
        "Any active card authorization has been released. Your bank may take some time to remove the pending authorization from your account.",
    },
  };

  const details =
    statusContent[normalizedStatus] || {
      subject:
        "Booking status updated — SoHo Cleaning Group",
      eyebrow: "Booking Update",
      title: "Your booking has been updated.",
      message: `Your booking status has been updated to ${formatLabel(
        status
      )}.`,
    };

  const plainNotice = details.notice
    ? `\n\n${details.notice}`
    : "";

  const text = `Hi ${customerName},

${details.message}${plainNotice}

If you have any questions about your booking, please contact SoHo Cleaning Group.

SoHo Cleaning Group`;

  const content = `
    ${greeting(customerName)}

    ${paragraph(details.message)}

    ${
      details.notice
        ? infoBox(escapeHtml(details.notice))
        : ""
    }

    ${paragraph(
      "If you have any questions about your booking, please contact SoHo Cleaning Group."
    )}

    ${closing()}
  `;

  return {
    subject: details.subject,
    text,
    html: emailLayout({
      eyebrow: details.eyebrow,
      title: details.title,
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Professional application
 * --------------------------------------------------------------------------
 */

export function getProfessionalApplicationReceivedEmail({
  professionalName,
}: ProfessionalApplicationReceivedEmailParams): EmailTemplate {
  const subject =
    "We received your application — SoHo Cleaning Group";

  const text = `Hi ${professionalName},

We have received your professional application and submitted documents.

Our team will review your profile and documents and contact you regarding next steps.

Thank you for your interest in working with SoHo Cleaning Group.

SoHo Cleaning Group`;

  const content = `
    ${greeting(professionalName)}

    ${paragraph(
      "We have received your professional application and submitted documents."
    )}

    ${infoBox(`
      Our team will review your profile and documents and contact you regarding next steps.
    `)}

    ${paragraph(
      "Thank you for your interest in working with SoHo Cleaning Group."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Application Received",
      title: "Thank you for applying.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Professional document reupload requested
 * --------------------------------------------------------------------------
 */

export function getProfessionalDocumentReuploadEmail({
  professionalName,
  reuploadUrl,
  expiresInDays = 7,
}: ProfessionalDocumentReuploadEmailParams): EmailTemplate {
  const subject =
    "Action required: Reupload your ID document — SoHo Cleaning Group";

  const text = `Hi ${professionalName},

We need you to reupload your ID document so we can continue reviewing your professional application.

Please use the secure link below to upload your document:

${reuploadUrl}

This secure link expires in ${expiresInDays} days.

If you have questions, please contact SoHo Cleaning Group.

SoHo Cleaning Group`;

  const content = `
    ${greeting(professionalName)}

    ${paragraph(
      "We need you to reupload your ID document so we can continue reviewing your professional application."
    )}

    ${infoBox(`
      Please use the secure link below to submit your updated ID document. This link expires in <strong>${expiresInDays} days</strong>.
    `)}

    ${button(
      "Reupload ID Document",
      reuploadUrl
    )}

    ${paragraph(
      "If you have questions about this request, please contact SoHo Cleaning Group."
    )}

    ${closing()}
  `;

  return {
    subject,
    text,
    html: emailLayout({
      eyebrow: "Action Required",
      title: "Please reupload your ID document.",
      content,
    }),
  };
}

/*
 * --------------------------------------------------------------------------
 * Shared email components
 * --------------------------------------------------------------------------
 */

function emailLayout({
  eyebrow,
  title,
  content,
}: {
  eyebrow: string;
  title: string;
  content: string;
}) {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;padding:0;background:#f6f6f4;">
        <div
          style="
            margin:0;
            padding:32px 16px;
            background:#f6f6f4;
            font-family:Arial,Helvetica,sans-serif;
            color:#171717;
          "
        >
          <div
            style="
              max-width:640px;
              margin:0 auto;
              background:#ffffff;
              border:1px solid #e5e2da;
              border-radius:18px;
              overflow:hidden;
            "
          >
            <div
              style="
                background:#0a0a0a;
                padding:30px 32px;
              "
            >
              <div
                style="
                  font-size:12px;
                  line-height:1.4;
                  letter-spacing:2px;
                  text-transform:uppercase;
                  color:#d6ab5f;
                "
              >
                SoHo Cleaning Group
              </div>

              <div
                style="
                  margin-top:14px;
                  font-size:12px;
                  line-height:1.4;
                  letter-spacing:1.5px;
                  text-transform:uppercase;
                  color:#aaa49a;
                "
              >
                ${escapeHtml(eyebrow)}
              </div>

              <h1
                style="
                  margin:8px 0 0;
                  color:#ffffff;
                  font-size:28px;
                  line-height:1.25;
                  font-weight:500;
                "
              >
                ${escapeHtml(title)}
              </h1>
            </div>

            <div style="padding:32px;">
              ${content}
            </div>

            <div
              style="
                border-top:1px solid #eeeae2;
                padding:22px 32px;
                font-size:12px;
                line-height:1.7;
                color:#8a8a8a;
              "
            >
              This is a service-related email from
              SoHo Cleaning Group regarding your booking,
              payment, or application.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function greeting(name: string) {
  return `
    <p
      style="
        margin:0 0 20px;
        font-size:16px;
        line-height:1.7;
        color:#171717;
      "
    >
      Hi ${escapeHtml(name)},
    </p>
  `;
}

function paragraph(value: string) {
  return `
    <p
      style="
        margin:0 0 20px;
        font-size:15px;
        line-height:1.75;
        color:#4a4a4a;
      "
    >
      ${value}
    </p>
  `;
}

function infoBox(content: string) {
  return `
    <div
      style="
        margin:24px 0;
        padding:18px 20px;
        background:#faf8f3;
        border:1px solid #e8dfce;
        border-radius:12px;
        font-size:14px;
        line-height:1.7;
        color:#4b453b;
      "
    >
      ${content}
    </div>
  `;
}

function successBox(content: string) {
  return `
    <div
      style="
        margin:24px 0;
        padding:18px 20px;
        background:#f6f8f5;
        border:1px solid #dce4d9;
        border-radius:12px;
        font-size:14px;
        line-height:1.7;
        color:#384236;
      "
    >
      ${content}
    </div>
  `;
}

function emailDetails(
  rows: Array<[string, string]>
) {
  return `
    <table
      style="
        width:100%;
        margin:24px 0;
        border-collapse:collapse;
        border-top:1px solid #eeeae2;
        border-bottom:1px solid #eeeae2;
      "
    >
      ${rows
        .map(
          ([label, value]) => `
            <tr>
              <td
                style="
                  padding:12px 0;
                  width:55%;
                  border-bottom:1px solid #f0ede7;
                  color:#777777;
                  font-size:14px;
                  vertical-align:top;
                "
              >
                ${escapeHtml(label)}
              </td>

              <td
                style="
                  padding:12px 0;
                  border-bottom:1px solid #f0ede7;
                  color:#171717;
                  font-size:14px;
                  font-weight:600;
                  text-align:right;
                  vertical-align:top;
                "
              >
                ${escapeHtml(value)}
              </td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

function button(
  label: string,
  href: string
) {
  return `
    <div style="margin:28px 0;">
      <a
        href="${escapeHtml(href)}"
        style="
          display:inline-block;
          background:#d6ab5f;
          color:#000000;
          text-decoration:none;
          padding:14px 22px;
          border-radius:10px;
          font-size:14px;
          font-weight:700;
        "
      >
        ${escapeHtml(label)}
      </a>
    </div>
  `;
}

function closing() {
  return `
    <p
      style="
        margin:28px 0 0;
        font-size:15px;
        line-height:1.7;
        color:#4a4a4a;
      "
    >
      SoHo Cleaning Group<br />
      <span style="color:#8f6b2f;">
        Pristine Spaces. Premium Care.
      </span>
    </p>
  `;
}

/*
 * --------------------------------------------------------------------------
 * Utilities
 * --------------------------------------------------------------------------
 */

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