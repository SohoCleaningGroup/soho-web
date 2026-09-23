import { NextResponse } from "next/server";
import {
  BookingStatus,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { notifyPaymentCaptured } from "@/lib/customer-notifications";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

export async function POST(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;

    const body = await req.json();

    const bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    const finalAmount = Number(body.finalAmount);

    const reason =
      typeof body.reason === "string"
        ? body.reason.trim()
        : "";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(finalAmount) ||
      finalAmount <= 0 ||
      finalAmount > 100_000 ||
      reason.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please enter a valid final service amount.",
        },
        { status: 400 }
      );
    }

    const requestedFinalAmountInCents = Math.round(
      finalAmount * 100
    );

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        userProfile: true,
        payments: {
          orderBy: [
            {
              isAdditionalAuthorization: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found.",
        },
        { status: 404 }
      );
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payments cannot be captured for a cancelled booking.",
        },
        { status: 400 }
      );
    }

    if (booking.payments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No payment authorizations were found for this booking.",
        },
        { status: 400 }
      );
    }

    const currencies = Array.from(
      new Set(
        booking.payments.map((payment) =>
          payment.currency.toUpperCase()
        )
      )
    );

    if (currencies.length !== 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This booking contains payments in different currencies and cannot be captured together.",
        },
        { status: 400 }
      );
    }

    const currency = currencies[0];

    /*
     * First reconcile every local payment with Stripe.
     *
     * This is important if an earlier request captured one PaymentIntent
     * successfully but failed before updating the local database or before
     * completing the remaining captures.
     */
    for (const payment of booking.payments) {
      if (!payment.paymentIntentId) {
        if (
          payment.status === PaymentStatus.AUTHORIZED ||
          payment.status === PaymentStatus.PAID
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `Payment ${payment.id} is missing its Stripe PaymentIntent ID.`,
            },
            { status: 400 }
          );
        }

        continue;
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          payment.paymentIntentId
        );

      if (paymentIntent.status === "succeeded") {
        const capturedAmountInCents =
          getCapturedAmountInCents(paymentIntent);

        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            capturedAmount:
              capturedAmountInCents / 100,
            paidAt: payment.paidAt || new Date(),
            transactionId:
              typeof paymentIntent.latest_charge ===
                "string"
                ? paymentIntent.latest_charge
                : payment.transactionId,
          },
        });

        continue;
      }

      if (paymentIntent.status === "canceled") {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.CANCELLED,
            capturedAmount: null,
            cancelledAt:
              payment.cancelledAt || new Date(),
          },
        });

        continue;
      }

      if (
        payment.status === PaymentStatus.AUTHORIZED &&
        paymentIntent.status !== "requires_capture"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Payment ${payment.id} is not ready for capture. Stripe status: ${paymentIntent.status}.`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * Reload after reconciliation so all calculations use the latest
     * local payment state.
     */
    const reconciledBooking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          userProfile: true,
          payments: {
            orderBy: [
              {
                isAdditionalAuthorization: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
          },
        },
      });

    if (!reconciledBooking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Booking could not be reloaded after payment reconciliation.",
        },
        { status: 404 }
      );
    }

    const alreadyCapturedInCents =
      reconciledBooking.payments
        .filter(
          (payment) =>
            payment.status === PaymentStatus.PAID
        )
        .reduce(
          (total, payment) =>
            total +
            Math.round(
              (payment.capturedAmount || 0) * 100
            ),
          0
        );

    const authorizedPayments =
      reconciledBooking.payments.filter(
        (payment) =>
          payment.status ===
          PaymentStatus.AUTHORIZED
      );

    const availableAuthorizationInCents =
      authorizedPayments.reduce(
        (total, payment) =>
          total +
          Math.round(payment.authorizedAmount * 100),
        0
      );

    const totalAvailableInCents =
      alreadyCapturedInCents +
      availableAuthorizationInCents;

    if (
      requestedFinalAmountInCents <
      alreadyCapturedInCents
    ) {
      return NextResponse.json(
        {
          success: false,
          message: `${formatCurrency(
            alreadyCapturedInCents,
            currency
          )} has already been captured. The final amount cannot be reduced below that value.`,
        },
        { status: 400 }
      );
    }

    if (
      requestedFinalAmountInCents >
      totalAvailableInCents
    ) {
      const additionalRequiredInCents =
        requestedFinalAmountInCents -
        totalAvailableInCents;

      return NextResponse.json(
        {
          success: false,
          requiresAdditionalAuthorization: true,
          additionalAmount:
            additionalRequiredInCents / 100,
          message: `An additional authorization of ${formatCurrency(
            additionalRequiredInCents,
            currency
          )} is required before this amount can be captured.`,
        },
        { status: 400 }
      );
    }

    let remainingToCaptureInCents =
      requestedFinalAmountInCents -
      alreadyCapturedInCents;

    const capturedPaymentIds: string[] = [];
    const releasedPaymentIds: string[] = [];

    /*
     * Original authorization comes first because payments were sorted by
     * isAdditionalAuthorization ascending and then by creation time.
     */
    for (const payment of authorizedPayments) {
      if (!payment.paymentIntentId) {
        return NextResponse.json(
          {
            success: false,
            message: `Authorized payment ${payment.id} is missing its Stripe PaymentIntent ID.`,
          },
          { status: 400 }
        );
      }

      const paymentIntent =
        await stripe.paymentIntents.retrieve(
          payment.paymentIntentId
        );

      /*
       * Another request may have completed this capture after our earlier
       * reconciliation. Synchronize and continue safely.
       */
      if (paymentIntent.status === "succeeded") {
        const capturedAmountInCents =
          getCapturedAmountInCents(paymentIntent);

        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.PAID,
            capturedAmount:
              capturedAmountInCents / 100,
            paidAt: payment.paidAt || new Date(),
            transactionId:
              typeof paymentIntent.latest_charge ===
                "string"
                ? paymentIntent.latest_charge
                : payment.transactionId,
          },
        });

        remainingToCaptureInCents = Math.max(
          0,
          remainingToCaptureInCents -
          capturedAmountInCents
        );

        capturedPaymentIds.push(payment.id);
        continue;
      }

      if (paymentIntent.status === "canceled") {
        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.CANCELLED,
            cancelledAt:
              payment.cancelledAt || new Date(),
          },
        });

        releasedPaymentIds.push(payment.id);
        continue;
      }

      if (
        paymentIntent.status !== "requires_capture"
      ) {
        return NextResponse.json(
          {
            success: false,
            partialProgress:
              capturedPaymentIds.length > 0,
            message: `Stripe payment ${payment.paymentIntentId} is not ready for capture. Current status: ${paymentIntent.status}.`,
          },
          { status: 409 }
        );
      }

      /*
       * The requested final amount has already been fulfilled.
       * Release this unused authorization completely.
       */
      if (remainingToCaptureInCents === 0) {
        const cancelledIntent =
          await stripe.paymentIntents.cancel(
            payment.paymentIntentId,
            {
              cancellation_reason:
                "requested_by_customer",
            },
            {
              idempotencyKey:
                `release-unused-payment-${payment.id}`,
            }
          );

        if (cancelledIntent.status !== "canceled") {
          return NextResponse.json(
            {
              success: false,
              partialProgress:
                capturedPaymentIds.length > 0,
              message: `Unable to release unused authorization ${payment.paymentIntentId}.`,
            },
            { status: 409 }
          );
        }

        await prisma.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.CANCELLED,
            capturedAmount: null,
            cancelledAt: new Date(),
          },
        });

        releasedPaymentIds.push(payment.id);
        continue;
      }

      const capturableInCents =
        paymentIntent.amount_capturable;

      if (capturableInCents <= 0) {
        return NextResponse.json(
          {
            success: false,
            partialProgress:
              capturedPaymentIds.length > 0,
            message: `Stripe reports that payment ${payment.paymentIntentId} has no amount available for capture.`,
          },
          { status: 409 }
        );
      }

      const amountToCaptureInCents = Math.min(
        remainingToCaptureInCents,
        capturableInCents
      );

      const capturedIntent =
        await stripe.paymentIntents.capture(
          payment.paymentIntentId,
          {
            amount_to_capture:
              amountToCaptureInCents,
          },
          {
            idempotencyKey:
              `capture-all-${bookingId}-${payment.id}-${amountToCaptureInCents}`,
          }
        );

      if (
        capturedIntent.status !== "succeeded"
      ) {
        return NextResponse.json(
          {
            success: false,
            partialProgress:
              capturedPaymentIds.length > 0,
            message: `Stripe capture did not complete for payment ${payment.paymentIntentId}. Current status: ${capturedIntent.status}.`,
          },
          { status: 409 }
        );
      }

      const actualCapturedInCents =
        getCapturedAmountInCents(capturedIntent);

      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.PAID,
          capturedAmount:
            actualCapturedInCents / 100,
          paidAt: new Date(),
          transactionId:
            typeof capturedIntent.latest_charge ===
              "string"
              ? capturedIntent.latest_charge
              : payment.transactionId,
        },
      });

      remainingToCaptureInCents = Math.max(
        0,
        remainingToCaptureInCents -
        actualCapturedInCents
      );

      capturedPaymentIds.push(payment.id);
    }

    if (remainingToCaptureInCents > 0) {
      console.error(
        "CAPTURE_ALL_INCOMPLETE_AFTER_PROCESSING",
        {
          bookingId,
          requestedFinalAmount:
            requestedFinalAmountInCents / 100,
          alreadyCaptured:
            alreadyCapturedInCents / 100,
          remainingToCapture:
            remainingToCaptureInCents / 100,
          capturedPaymentIds,
          releasedPaymentIds,
        }
      );

      return NextResponse.json(
        {
          success: false,
          partialProgress:
            capturedPaymentIds.length > 0,
          message: `${formatCurrency(
            remainingToCaptureInCents,
            currency
          )} could not be captured. Refresh the booking and try again.`,
        },
        { status: 409 }
      );
    }

    const finalBooking =
      await prisma.booking.findUnique({
        where: {
          id: bookingId,
        },
        include: {
          userProfile: true,
          payments: {
            orderBy: [
              {
                isAdditionalAuthorization: "asc",
              },
              {
                createdAt: "asc",
              },
            ],
          },
        },
      });

    if (!finalBooking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Payment capture completed, but the updated booking could not be loaded.",
        },
        { status: 500 }
      );
    }

    const finalCapturedInCents =
      finalBooking.payments
        .filter(
          (payment) =>
            payment.status === PaymentStatus.PAID
        )
        .reduce(
          (total, payment) =>
            total +
            Math.round(
              (payment.capturedAmount || 0) * 100
            ),
          0
        );

    /*
     * A Twilio failure must not turn a successful financial operation
     * into an API failure.
     */
    const notificationResult =
      await notifyPaymentCaptured({
        phone: finalBooking.userProfile.phone,
        email: finalBooking.userProfile.email,
        customerName:
          finalBooking.userProfile.fullName,
        amount: finalCapturedInCents / 100,
        currency,
      });

    if (
      !notificationResult.smsSent ||
      !notificationResult.emailSent
    ) {
      console.warn(
        "PAYMENT_CAPTURED_NOTIFICATION_PARTIAL_FAILURE",
        {
          bookingId: finalBooking.id,
          smsSent: notificationResult.smsSent,
          emailSent: notificationResult.emailSent,
        }
      );
    }

    console.log(
      "STRIPE_ALL_AUTHORIZATIONS_CAPTURED",
      {
        bookingId,
        requestedFinalAmount:
          requestedFinalAmountInCents / 100,
        totalCaptured:
          finalCapturedInCents / 100,
        capturedPaymentIds,
        releasedPaymentIds,
        adjustmentReason: reason || null,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        releasedPaymentIds.length > 0
          ? `${formatCurrency(
            finalCapturedInCents,
            currency
          )} captured successfully. Unused authorizations were released.`
          : `${formatCurrency(
            finalCapturedInCents,
            currency
          )} captured successfully.`,
      data: {
        bookingId,
        capturedAmount:
          finalCapturedInCents / 100,
        currency,
        capturedPaymentIds,
        releasedPaymentIds,
        notifications: {
          smsSent: notificationResult.smsSent,
          emailSent: notificationResult.emailSent,
        },
      },
    });
  } catch (error) {
    console.error(
      "ADMIN_CAPTURE_ALL_PAYMENTS_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while capturing the authorized payments. Refresh the booking to check whether any payment was already captured before trying again.",
      },
      { status: 500 }
    );
  }
}

function getCapturedAmountInCents(
  paymentIntent: Awaited<
    ReturnType<typeof stripe.paymentIntents.retrieve>
  >
) {
  if (paymentIntent.amount_received > 0) {
    return paymentIntent.amount_received;
  }

  return paymentIntent.amount;
}

function formatCurrency(
  amountInCents: number,
  currency: string
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100);
}
