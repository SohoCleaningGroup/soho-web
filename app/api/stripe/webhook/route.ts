import { bindReferral, releaseReferral } from "@/lib/referrals/service";
import { NextResponse } from "next/server";
import {
  AdditionalAuthorizationStatus,
  BookingStatus,
  CleaningFrequency,
  CleaningType,
  PaymentStatus,
} from "@prisma/client";

import { consentFromCheckoutMetadata } from "@/lib/messaging/sms-consent";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import {
  calculateCleaningPrice,
  getHomeSizeLabel,
  type CleaningType as PricingCleaningType,
  type HomeSize,
} from "@/lib/pricing/cleaning-pricing";
import {
  notifyAdditionalAuthorizationCompleted,
  notifyBookingCreated,
} from "@/lib/customer-notifications";
import { notifyAdminsOfNewBooking } from "@/lib/admin-booking-notifications";
import { rejectOversizedRequest } from "@/lib/security/request";

const ORIGINAL_BOOKING_FLOW = "MANUAL_CAPTURE";
const ADDITIONAL_AUTHORIZATION_FLOW = "ADDITIONAL_AUTHORIZATION";

export async function POST(req: Request) {
  try {
    const rejected = rejectOversizedRequest(req, 1024 * 1024);
    if (rejected) return rejected;

    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Stripe signature.",
        },
        { status: 400 }
      );
    }

    const rawBody = await req.text();

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === "checkout.session.expired") {
      const expiredSession = event.data.object;
      await releaseReferral({ checkoutSessionId: expiredSession.id });

      await prisma.bookingSlotHold
        .deleteMany({ where: { checkoutSessionId: expiredSession.id } })
        .catch((error) =>
          console.warn("BOOKING_SLOT_HOLD_EXPIRE_RELEASE_FAILED", {
            checkoutSessionId: expiredSession.id,
            error,
          })
        );

      return NextResponse.json({
        received: true,
        releasedExpiredSlotHold: true,
      });
    }

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({
        received: true,
        ignoredEventType: event.type,
      });
    }

    const session = event.data.object;
    const metadata = session.metadata;

    if (!metadata) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Checkout Session metadata.",
        },
        { status: 400 }
      );
    }

    if (typeof session.payment_intent !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Missing Stripe PaymentIntent.",
        },
        { status: 400 }
      );
    }

    const paymentIntentId = session.payment_intent;

    /*
     * Stripe may retry webhook deliveries. Both fields are unique in the
     * database, so this prevents duplicate booking/payment creation.
     */
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          {
            checkoutSessionId: session.id,
          },
          {
            paymentIntentId,
          },
        ],
      },
      include: {
        booking: true,
      },
    });

    if (existingPayment) {
      await bindReferral(metadata.referralUseId, session.id, existingPayment.bookingId);
      await prisma.bookingSlotHold
        .deleteMany({ where: { checkoutSessionId: session.id } })
        .catch(() => undefined);

      console.log("STRIPE_WEBHOOK_DUPLICATE_SKIPPED", {
        checkoutSessionId: session.id,
        paymentIntentId,
        paymentId: existingPayment.id,
        bookingId: existingPayment.bookingId,
      });

      return NextResponse.json({
        received: true,
        duplicate: true,
        paymentId: existingPayment.id,
        bookingId: existingPayment.bookingId,
      });
    }

    const paymentIntent =
      await stripe.paymentIntents.retrieve(paymentIntentId);

    const paymentState = getPaymentState(paymentIntent.status);

    if (!paymentState) {
      console.error("UNEXPECTED_PAYMENT_INTENT_STATUS", {
        checkoutSessionId: session.id,
        paymentIntentId,
        status: paymentIntent.status,
      });

      return NextResponse.json(
        {
          success: false,
          message: `Unexpected PaymentIntent status: ${paymentIntent.status}`,
        },
        { status: 400 }
      );
    }

    const paymentFlow =
      metadata.paymentFlow ||
      paymentIntent.metadata.paymentFlow ||
      ORIGINAL_BOOKING_FLOW;

    if (paymentFlow === ADDITIONAL_AUTHORIZATION_FLOW) {
      return handleAdditionalAuthorization({
        sessionId: session.id,
        paymentIntentId,
        paymentIntent,
        metadata,
        paymentState,
      });
    }

    return handleOriginalBooking({
      sessionId: session.id,
      paymentIntentId,
      paymentIntent,
      metadata,
      paymentState,
    });
  } catch (error) {
    console.error("STRIPE_WEBHOOK_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Webhook error.",
      },
      { status: 400 }
    );
  }
}

async function handleOriginalBooking({
  sessionId,
  paymentIntentId,
  paymentIntent,
  metadata,
  paymentState,
}: {
  sessionId: string;
  paymentIntentId: string;
  paymentIntent: Awaited<
    ReturnType<typeof stripe.paymentIntents.retrieve>
  >;
  metadata: Record<string, string>;
  paymentState: ReturnType<typeof getPaymentState> extends infer T
  ? Exclude<T, null>
  : never;
}) {
  const requiredMetadata = [
    "fullName",
    "email",
    "phone",
    "cleaningType",
    "homeSize",
  ] as const;

  const missingField = requiredMetadata.find(
    (field) => !metadata[field]
  );

  if (missingField) {
    return NextResponse.json(
      {
        success: false,
        message: `Missing required booking metadata: ${missingField}.`,
      },
      { status: 400 }
    );
  }

  const pricing = calculateCleaningPrice({
    cleaningType:
      metadata.cleaningType as PricingCleaningType,
    homeSize: metadata.homeSize as HomeSize,
    totalSqft: Number(metadata.totalSqft),
    frequency: metadata.frequency,
  });

  const selectedAddOns = metadata.selectedAddOns
    ? metadata.selectedAddOns.split(",").filter(Boolean)
    : [];

  const addOnTotal = parseMoney(metadata.addOnTotal);

  const calculatedTotal = Number(
    (pricing.total + addOnTotal - Number(metadata.referralDiscountCents || 0) / 100).toFixed(2)
  );

  const stripeAmount = getStripePaymentAmount(paymentIntent);

  if (stripeAmount !== calculatedTotal) {
    console.warn("STRIPE_AMOUNT_MISMATCH", {
      paymentIntentId,
      stripeAmount,
      calculatedTotal,
    });
  }

  const user = await prisma.userProfile.upsert({
    where: {
      email: metadata.email,
    },
    update: {
      fullName: metadata.fullName,
      phone: metadata.phone,
      address: metadata.address || null,
      apartment: metadata.apartment || null,
      city: metadata.city || null,
      state: metadata.state || null,
      zipCode: metadata.zipCode || null,
    },
    create: {
      fullName: metadata.fullName,
      email: metadata.email,
      phone: metadata.phone,
      address: metadata.address || null,
      apartment: metadata.apartment || null,
      city: metadata.city || null,
      state: metadata.state || null,
      zipCode: metadata.zipCode || null,
    },
  });

  const booking = await prisma.booking.create({
    data: {
      userProfileId: user.id,
      ...consentFromCheckoutMetadata(metadata),

      cleaningType:
        metadata.cleaningType as CleaningType,

      homeSize: metadata.homeSize,

      totalSqft: parseOptionalInteger(
        metadata.totalSqft
      ),

      estimatedDurationMinutes: parseOptionalInteger(
        metadata.estimatedDurationMinutes
      ),

      bedrooms: parseOptionalInteger(
        metadata.bedrooms
      ),

      bathrooms: parseOptionalInteger(
        metadata.bathrooms
      ),

      kitchens: parseOptionalInteger(
        metadata.kitchens
      ),

      hasPets: metadata.hasPets === "true",

      selectedAddOns,
      addOnTotal,

      preferredDate: metadata.preferredDate
        ? new Date(metadata.preferredDate)
        : null,

      preferredTime:
        metadata.preferredTime || null,

      frequency:
        metadata.frequency as CleaningFrequency,

      specialNotes:
        metadata.specialNotes || null,

      status: BookingStatus.PENDING,

      payments: {
        create: {
          authorizedAmount: stripeAmount,

          capturedAmount:
            paymentState.status === PaymentStatus.PAID
              ? stripeAmount
              : null,

          currency:
            paymentIntent.currency.toUpperCase(),

          status: paymentState.status,

          isAdditionalAuthorization: false,

          provider: "STRIPE",

          checkoutSessionId: sessionId,
          paymentIntentId,

          transactionId:
            paymentState.status === PaymentStatus.PAID &&
              typeof paymentIntent.latest_charge === "string"
              ? paymentIntent.latest_charge
              : null,

          authorizedAt:
            paymentState.authorizedAt,

          paidAt:
            paymentState.paidAt,
        },
      },
    },
    include: {
      userProfile: true,
      payments: true,
    },
  });

  await prisma.bookingSlotHold
    .deleteMany({ where: { checkoutSessionId: sessionId } })
    .catch((error) =>
      console.warn("BOOKING_SLOT_HOLD_RELEASE_FAILED", {
        checkoutSessionId: sessionId,
        bookingId: booking.id,
        error,
      })
    );

  await bindReferral(metadata.referralUseId, sessionId, booking.id);

  console.log("STRIPE_BOOKING_CREATED", {
    bookingId: booking.id,
    checkoutSessionId: sessionId,
    paymentIntentId,
    paymentIntentStatus: paymentIntent.status,
    paymentStatus: paymentState.status,
    authorizedAmount: stripeAmount,
  });

  const bookingDate = booking.preferredDate
    ? booking.preferredDate.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "your selected date";

  const bookingTime =
    booking.preferredTime
      ? formatBookingTime(booking.preferredTime)
      : "your selected time";

  const customerNotification =
    await notifyBookingCreated({
      phone: booking.userProfile.phone,
      email: booking.userProfile.email,
      customerName: booking.userProfile.fullName,
      date: bookingDate,
      time: bookingTime,
      bookingId: booking.id,
      service: readableLabel(booking.cleaningType),
      homeSize: getHomeSizeLabel(booking.homeSize as HomeSize),
      addOns: booking.selectedAddOns.map(readableLabel),
      address: formatCustomerAddress(booking.userProfile),
      authorizedAmount: stripeAmount,
    });

  if (
    (!customerNotification.smsSent && !customerNotification.smsSkipped) ||
    !customerNotification.emailSent
  ) {
    console.warn(
      "BOOKING_CREATED_CUSTOMER_NOTIFICATION_PARTIAL_FAILURE",
      {
        bookingId: booking.id,
        smsSent: customerNotification.smsSent,
        emailSent: customerNotification.emailSent,
      }
    );
  }

  try {
    await notifyAdminsOfNewBooking({
      bookingId: booking.id,

      customer: {
        fullName: booking.userProfile.fullName,
        email: booking.userProfile.email,
        phone: booking.userProfile.phone,
        address: booking.userProfile.address,
        apartment: booking.userProfile.apartment,
        city: booking.userProfile.city,
        state: booking.userProfile.state,
        zipCode: booking.userProfile.zipCode,
      },

      cleaningType: booking.cleaningType,
      homeSize: booking.homeSize,

      bedrooms: booking.bedrooms,
      bathrooms: booking.bathrooms,
      kitchens: booking.kitchens,

      hasPets: booking.hasPets,

      selectedAddOns: booking.selectedAddOns,
      addOnTotal: booking.addOnTotal,

      preferredDate: booking.preferredDate,
      preferredTime: booking.preferredTime,

      frequency: booking.frequency,

      specialNotes: booking.specialNotes,

      authorizedAmount: stripeAmount,
      currency: paymentIntent.currency.toUpperCase(),
    });
  } catch (error) {
    /*
     * A notification failure must never turn a successful booking
     * into a failed Stripe webhook.
     */
    console.error(
      "ADMIN_NEW_BOOKING_NOTIFICATION_ERROR",
      {
        bookingId: booking.id,
        error,
      }
    );
  }

  return NextResponse.json({
    received: true,
    flow: "ORIGINAL_BOOKING",
    bookingId: booking.id,
    paymentStatus: paymentState.status,
  });
}

async function handleAdditionalAuthorization({
  sessionId,
  paymentIntentId,
  paymentIntent,
  metadata,
  paymentState,
}: {
  sessionId: string;
  paymentIntentId: string;
  paymentIntent: Awaited<
    ReturnType<typeof stripe.paymentIntents.retrieve>
  >;
  metadata: Record<string, string>;
  paymentState: ReturnType<typeof getPaymentState> extends infer T
  ? Exclude<T, null>
  : never;
}) {
  const additionalAuthorizationId =
    metadata.additionalAuthorizationId ||
    paymentIntent.metadata.additionalAuthorizationId;

  if (!additionalAuthorizationId) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason: "Missing additional authorization ID",
    });

    return NextResponse.json(
      {
        success: false,
        message:
          "Missing additional authorization request ID.",
      },
      { status: 400 }
    );
  }

  const authorization =
    await prisma.additionalAuthorization.findUnique({
      where: {
        id: additionalAuthorizationId,
      },
      include: {
        booking: {
          include: {
            userProfile: true,
          },
        },
      },
    });

  if (!authorization) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason:
        "Additional authorization request not found",
    });

    return NextResponse.json(
      {
        success: false,
        message:
          "Additional authorization request not found.",
      },
      { status: 404 }
    );
  }

  /*
   * A successfully processed request may be delivered again under a
   * different webhook retry. Avoid creating a second Payment.
   */
  if (
    authorization.status ===
    AdditionalAuthorizationStatus.AUTHORIZED
  ) {
    return NextResponse.json({
      received: true,
      duplicate: true,
      flow: ADDITIONAL_AUTHORIZATION_FLOW,
      additionalAuthorizationId:
        authorization.id,
      paymentId: authorization.paymentId,
    });
  }

  if (
    authorization.booking.status ===
    BookingStatus.CANCELLED ||
    authorization.status ===
    AdditionalAuthorizationStatus.CANCELLED
  ) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason:
        "Booking or authorization request was cancelled",
    });

    return NextResponse.json({
      received: true,
      rejected: true,
      reason: "REQUEST_CANCELLED",
    });
  }

  if (
    authorization.status ===
    AdditionalAuthorizationStatus.EXPIRED ||
    authorization.expiresAt <= new Date()
  ) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason:
        "Additional authorization request expired",
    });

    if (
      authorization.status ===
      AdditionalAuthorizationStatus.PENDING
    ) {
      await prisma.additionalAuthorization.update({
        where: {
          id: authorization.id,
        },
        data: {
          status:
            AdditionalAuthorizationStatus.EXPIRED,
        },
      });
    }

    return NextResponse.json({
      received: true,
      rejected: true,
      reason: "REQUEST_EXPIRED",
    });
  }

  if (
    authorization.status !==
    AdditionalAuthorizationStatus.PENDING
  ) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason:
        "Additional authorization request unavailable",
    });

    return NextResponse.json({
      received: true,
      rejected: true,
      reason: "REQUEST_UNAVAILABLE",
    });
  }

  const metadataBookingId =
    metadata.bookingId ||
    paymentIntent.metadata.bookingId;

  if (
    metadataBookingId &&
    metadataBookingId !== authorization.bookingId
  ) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason: "Booking metadata mismatch",
    });

    return NextResponse.json(
      {
        success: false,
        message: "Booking metadata mismatch.",
      },
      { status: 400 }
    );
  }

  const stripeAmount =
    getStripePaymentAmount(paymentIntent);

  const expectedAmount = Number(
    authorization.additionalAmount.toFixed(2)
  );

  if (stripeAmount !== expectedAmount) {
    await releaseUnexpectedAuthorization({
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      reason: "Authorization amount mismatch",
    });

    console.error(
      "ADDITIONAL_AUTHORIZATION_AMOUNT_MISMATCH",
      {
        additionalAuthorizationId:
          authorization.id,
        paymentIntentId,
        stripeAmount,
        expectedAmount,
      }
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Additional authorization amount mismatch.",
      },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const additionalPayment =
        await tx.payment.create({
          data: {
            bookingId: authorization.bookingId,

            authorizedAmount: stripeAmount,

            capturedAmount:
              paymentState.status ===
                PaymentStatus.PAID
                ? stripeAmount
                : null,

            currency:
              paymentIntent.currency.toUpperCase(),

            status: paymentState.status,

            isAdditionalAuthorization: true,

            provider: "STRIPE",

            checkoutSessionId: sessionId,
            paymentIntentId,

            transactionId:
              paymentState.status ===
                PaymentStatus.PAID &&
                typeof paymentIntent.latest_charge ===
                "string"
                ? paymentIntent.latest_charge
                : null,

            authorizedAt:
              paymentState.authorizedAt,

            paidAt: paymentState.paidAt,
          },
        });

      const updatedAuthorization =
        await tx.additionalAuthorization.update({
          where: {
            id: authorization.id,
          },
          data: {
            status:
              AdditionalAuthorizationStatus.AUTHORIZED,

            authorizedAt:
              paymentState.authorizedAt ||
              paymentState.paidAt ||
              new Date(),

            /*
             * Before authorization, paymentId pointed to the source
             * payment. It now points to the newly authorized payment.
             */
            paymentId: additionalPayment.id,
          },
        });

      return {
        additionalPayment,
        updatedAuthorization,
      };
    }
  );

  const customerNotification =
    await notifyAdditionalAuthorizationCompleted({
      bookingId: authorization.booking.id,
      phone:
        authorization.booking.userProfile.phone,
      email:
        authorization.booking.userProfile.email,
      customerName:
        authorization.booking.userProfile.fullName,
      amount: stripeAmount,
      currency:
        result.additionalPayment.currency,
    });

  if (
    (!customerNotification.smsSent && !customerNotification.smsSkipped) ||
    !customerNotification.emailSent
  ) {
    console.warn(
      "ADDITIONAL_AUTHORIZATION_COMPLETED_NOTIFICATION_PARTIAL_FAILURE",
      {
        additionalAuthorizationId:
          authorization.id,
        bookingId: authorization.bookingId,
        smsSent: customerNotification.smsSent,
        emailSent: customerNotification.emailSent,
      }
    );
  }

  console.log(
    "ADDITIONAL_AUTHORIZATION_COMPLETED",
    {
      additionalAuthorizationId:
        authorization.id,
      bookingId: authorization.bookingId,
      paymentId:
        result.additionalPayment.id,
      checkoutSessionId: sessionId,
      paymentIntentId,
      paymentIntentStatus: paymentIntent.status,
      paymentStatus: paymentState.status,
      authorizedAmount: stripeAmount,
    }
  );

  return NextResponse.json({
    received: true,
    flow: ADDITIONAL_AUTHORIZATION_FLOW,
    additionalAuthorizationId:
      authorization.id,
    bookingId: authorization.bookingId,
    paymentId: result.additionalPayment.id,
    paymentStatus: paymentState.status,
  });
}

function getPaymentState(
  paymentIntentStatus: string
) {
  if (paymentIntentStatus === "requires_capture") {
    return {
      status: PaymentStatus.AUTHORIZED,
      authorizedAt: new Date(),
      paidAt: null,
    };
  }

  if (paymentIntentStatus === "succeeded") {
    return {
      status: PaymentStatus.PAID,
      authorizedAt: null,
      paidAt: new Date(),
    };
  }

  return null;
}

function getStripePaymentAmount(
  paymentIntent: Awaited<
    ReturnType<typeof stripe.paymentIntents.retrieve>
  >
) {
  const amountInCents =
    paymentIntent.status === "succeeded" &&
      paymentIntent.amount_received > 0
      ? paymentIntent.amount_received
      : paymentIntent.amount;

  return Number((amountInCents / 100).toFixed(2));
}

function parseOptionalInteger(
  value: string | undefined
) {
  if (!value) {
    return null;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? Math.trunc(parsedValue)
    : null;
}

function parseMoney(value: string | undefined) {
  const parsedValue = Number(value || 0);

  return Number.isFinite(parsedValue)
    ? Number(parsedValue.toFixed(2))
    : 0;
}

async function releaseUnexpectedAuthorization({
  paymentIntentId,
  paymentIntentStatus,
  reason,
}: {
  paymentIntentId: string;
  paymentIntentStatus: string;
  reason: string;
}) {
  if (paymentIntentStatus !== "requires_capture") {
    return;
  }

  try {
    await stripe.paymentIntents.cancel(
      paymentIntentId,
      {
        cancellation_reason:
          "requested_by_customer",
      },
      {
        idempotencyKey:
          `release-invalid-additional-authorization-${paymentIntentId}`,
      }
    );

    console.warn(
      "UNEXPECTED_AUTHORIZATION_RELEASED",
      {
        paymentIntentId,
        reason,
      }
    );
  } catch (error) {
    console.error(
      "UNEXPECTED_AUTHORIZATION_RELEASE_FAILED",
      {
        paymentIntentId,
        reason,
        error,
      }
    );
  }
}

function readableLabel(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatBookingTime(slot: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(slot);
  if (!match) return slot;

  const format = (hourValue: string, minute: string) => {
    const hour = Number(hourValue);
    return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
  };

  return `${format(match[1], match[2])} (start time, New York)`;
}

function formatCustomerAddress(customer: {
  address?: string | null;
  apartment?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}) {
  const apartment = customer.apartment?.trim();
  const city = customer.city?.trim();
  const displayCity = city && /^(ny|nyc|new york)$/i.test(city)
    ? "New York"
    : city;

  return [
    customer.address?.trim(),
    apartment
      ? /^(apt\.?|apartment|unit|suite|ste\.?|#)/i.test(apartment)
        ? apartment
        : `Apt ${apartment}`
      : null,
    displayCity,
    customer.state?.trim().toUpperCase(),
    customer.zipCode?.trim(),
  ].filter(Boolean).join(", ");
}
