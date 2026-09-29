import { sendEmail } from "@/lib/sendgrid";

import {
    getAdditionalAuthorizationCompletedSmsBody,
    getAdditionalAuthorizationSmsBody,
    getBookingCreatedSmsBody,
    getBookingStatusSmsBody,
    getPaymentCapturedSmsBody,
    getProfessionalApplicationReceivedSmsBody,
    sendSms,
} from "@/lib/twilio";

import {
    getAdditionalAuthorizationCompletedEmail,
    getAdditionalAuthorizationRequestedEmail,
    getBookingCreatedEmail,
    getBookingStatusEmail,
    getPaymentCapturedEmail,
    getProfessionalApplicationReceivedEmail,
    getProfessionalDocumentReuploadEmail,
} from "@/lib/customer-email-templates";

export type NotificationResult = {
    smsSent: boolean;
    emailSent: boolean;
};

type Recipient = {
    phone: string;
    email: string;
};

type CustomerRecipient = Recipient & {
    customerName: string;
};

/*
 * --------------------------------------------------------------------------
 * Booking created
 * --------------------------------------------------------------------------
 */

export async function notifyBookingCreated({
    phone,
    email,
    customerName,
    date,
    time,
    bookingId,
    service,
    homeSize,
    addOns,
    address,
    authorizedAmount,
}: CustomerRecipient & {
    date: string;
    time: string;
    bookingId: string;
    service: string;
    homeSize: string;
    addOns: string[];
    address: string;
    authorizedAmount: number;
}): Promise<NotificationResult> {
    const emailTemplate = getBookingCreatedEmail({
        customerName,
        date,
        time,
        bookingId,
        service,
        homeSize,
        addOns,
        address,
        authorizedAmount,
    });

    return sendCustomerNotification({
        event: "BOOKING_CREATED",
        phone,
        email,
        smsBody: getBookingCreatedSmsBody({
            date,
            time,
        }),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Booking status changed
 * --------------------------------------------------------------------------
 */

export async function notifyBookingStatusChanged({
    phone,
    email,
    customerName,
    status,
}: CustomerRecipient & {
    status: string;
}): Promise<NotificationResult> {
    const emailTemplate = getBookingStatusEmail({
        customerName,
        status,
    });

    return sendCustomerNotification({
        event: `BOOKING_STATUS_${status.toUpperCase()}`,
        phone,
        email,
        smsBody: getBookingStatusSmsBody(status),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Payment captured
 * --------------------------------------------------------------------------
 */

export async function notifyPaymentCaptured({
    phone,
    email,
    customerName,
    amount,
    currency = "USD",
}: CustomerRecipient & {
    amount: number;
    currency?: string;
}): Promise<NotificationResult> {
    const emailTemplate = getPaymentCapturedEmail({
        customerName,
        amount,
        currency,
    });

    return sendCustomerNotification({
        event: "PAYMENT_CAPTURED",
        phone,
        email,
        smsBody: getPaymentCapturedSmsBody({
            amount,
            currency,
        }),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Additional authorization requested / resent
 * --------------------------------------------------------------------------
 */

export async function notifyAdditionalAuthorizationRequested({
    phone,
    email,
    customerName,
    additionalAmount,
    finalAmount,
    reason,
    authorizationLink,
    expiresInHours = 24,
}: CustomerRecipient & {
    additionalAmount: number;
    finalAmount: number;
    reason?: string;
    authorizationLink: string;
    expiresInHours?: number;
}): Promise<NotificationResult> {
    const emailTemplate =
        getAdditionalAuthorizationRequestedEmail({
            customerName,
            additionalAmount,
            finalAmount,
            reason,
            authorizationLink,
            expiresInHours,
        });

    return sendCustomerNotification({
        event: "ADDITIONAL_AUTHORIZATION_REQUESTED",
        phone,
        email,
        smsBody: getAdditionalAuthorizationSmsBody({
            additionalAmount,
            finalAmount,
            reason,
            authorizationLink,
            expiresInHours,
        }),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Additional authorization completed
 * --------------------------------------------------------------------------
 */

export async function notifyAdditionalAuthorizationCompleted({
    phone,
    email,
    customerName,
    amount,
    currency = "USD",
}: CustomerRecipient & {
    amount: number;
    currency?: string;
}): Promise<NotificationResult> {
    const emailTemplate =
        getAdditionalAuthorizationCompletedEmail({
            customerName,
            amount,
            currency,
        });

    return sendCustomerNotification({
        event: "ADDITIONAL_AUTHORIZATION_COMPLETED",
        phone,
        email,
        smsBody:
            getAdditionalAuthorizationCompletedSmsBody({
                amount,
                currency,
            }),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Professional application received
 * --------------------------------------------------------------------------
 */

export async function notifyProfessionalApplicationReceived({
    phone,
    email,
    professionalName,
}: Recipient & {
    professionalName: string;
}): Promise<NotificationResult> {
    const emailTemplate =
        getProfessionalApplicationReceivedEmail({
            professionalName,
        });

    return sendCustomerNotification({
        event: "PROFESSIONAL_APPLICATION_RECEIVED",
        phone,
        email,
        smsBody:
            getProfessionalApplicationReceivedSmsBody(),
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Professional document reupload requested
 * --------------------------------------------------------------------------
 */

export async function notifyProfessionalDocumentReuploadRequested({
    phone,
    email,
    professionalName,
    reuploadUrl,
    expiresInDays = 7,
}: Recipient & {
    professionalName: string;
    reuploadUrl: string;
    expiresInDays?: number;
}): Promise<NotificationResult> {
    const emailTemplate =
        getProfessionalDocumentReuploadEmail({
            professionalName,
            reuploadUrl,
            expiresInDays,
        });

    return sendCustomerNotification({
        event: "PROFESSIONAL_DOCUMENT_REUPLOAD_REQUESTED",
        phone,
        email,
        smsBody:
            `SoHo Cleaning Group: Please reupload your ID document using this secure link: ${reuploadUrl}`,
        emailTemplate,
    });
}

/*
 * --------------------------------------------------------------------------
 * Shared delivery
 * --------------------------------------------------------------------------
 */

async function sendCustomerNotification({
    event,
    phone,
    email,
    smsBody,
    emailTemplate,
}: {
    event: string;
    phone: string;
    email: string;
    smsBody: string;
    emailTemplate: {
        subject: string;
        text: string;
        html: string;
    };
}): Promise<NotificationResult> {
    /*
     * SMS and email are intentionally sent independently.
     *
     * A Twilio failure must not prevent SendGrid delivery,
     * and a SendGrid failure must not prevent Twilio delivery.
     */
    const [smsResult, emailResult] =
        await Promise.allSettled([
            sendSms({
                to: phone,
                body: smsBody,
            }),

            sendEmail({
                to: [email],
                subject: emailTemplate.subject,
                text: emailTemplate.text,
                html: emailTemplate.html,
            }),
        ]);

    const smsSent =
        smsResult.status === "fulfilled"
            ? smsResult.value
            : false;

    const emailSent =
        emailResult.status === "fulfilled"
            ? emailResult.value
            : false;

    if (smsResult.status === "rejected") {
        console.error(
            "CUSTOMER_NOTIFICATION_SMS_REJECTED",
            {
                event,
                phone,
                error: smsResult.reason,
            }
        );
    }

    if (emailResult.status === "rejected") {
        console.error(
            "CUSTOMER_NOTIFICATION_EMAIL_REJECTED",
            {
                event,
                email,
                error: emailResult.reason,
            }
        );
    }

    console.log("CUSTOMER_NOTIFICATION_RESULT", {
        event,
        phone,
        email,
        smsSent,
        emailSent,
    });

    return {
        smsSent,
        emailSent,
    };
}