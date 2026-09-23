import { NextResponse } from "next/server";
import {
  BookingStatus,
  PaymentStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { notifyBookingStatusChanged } from "@/lib/customer-notifications";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

export async function PATCH(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;

    const body = await req.json();

    const bookingId =
      typeof body.bookingId === "string"
        ? body.bookingId.trim()
        : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status
        : "";

    if (!bookingId || !requestedStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID and status are required.",
        },
        { status: 400 }
      );
    }

    if (
      !Object.values(BookingStatus).includes(
        requestedStatus as BookingStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking status.",
        },
        { status: 400 }
      );
    }

    const nextStatus = requestedStatus as BookingStatus;

    const existingBooking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        userProfile: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Safely handle repeated status requests.
     */
    if (existingBooking.status === nextStatus) {
      return NextResponse.json({
        success: true,
        unchanged: true,
        message: `Booking is already ${formatLabel(nextStatus)}.`,
        data: existingBooking,
      });
    }

    /*
     * If the booking is being cancelled, release any active
     * Stripe card authorization before changing the booking status.
     */
    if (nextStatus === BookingStatus.CANCELLED) {
      const paidPayment = existingBooking.payments.find(
        (payment) => payment.status === PaymentStatus.PAID
      );

      if (paidPayment) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This payment has already been captured. Refund the payment before cancelling the booking.",
          },
          { status: 400 }
        );
      }

      const authorizedPayments = existingBooking.payments.filter(
        (payment) =>
          payment.status === PaymentStatus.AUTHORIZED
      );

      const stripePaymentStates: Array<{
        paymentId: string;
        paymentIntentId: string;
        stripeStatus: string;
      }> = [];

      /*
       * First inspect every authorized payment before cancelling any.
       * This avoids releasing one authorization and then discovering
       * that another payment has already been captured.
       */
      for (const payment of authorizedPayments) {
        if (!payment.paymentIntentId) {
          return NextResponse.json(
            {
              success: false,
              message:
                "An authorized payment is missing its Stripe PaymentIntent ID.",
            },
            { status: 400 }
          );
        }

        const paymentIntent =
          await stripe.paymentIntents.retrieve(
            payment.paymentIntentId
          );

        if (paymentIntent.status === "succeeded") {
          await prisma.payment.update({
            where: {
              id: payment.id,
            },
            data: {
              status: PaymentStatus.PAID,
              paidAt: payment.paidAt || new Date(),
              transactionId:
                typeof paymentIntent.latest_charge === "string"
                  ? paymentIntent.latest_charge
                  : payment.transactionId,
            },
          });

          return NextResponse.json(
            {
              success: false,
              message:
                "Stripe shows that this payment has already been captured. The payment status was synchronized. Refund it before cancelling the booking.",
            },
            { status: 400 }
          );
        }

        if (
          paymentIntent.status !== "requires_capture" &&
          paymentIntent.status !== "canceled"
        ) {
          return NextResponse.json(
            {
              success: false,
              message: `The authorization cannot be released while its Stripe status is ${paymentIntent.status}.`,
            },
            { status: 400 }
          );
        }

        stripePaymentStates.push({
          paymentId: payment.id,
          paymentIntentId: payment.paymentIntentId,
          stripeStatus: paymentIntent.status,
        });
      }

      /*
       * Release each authorization that is still active.
       */
      for (const paymentState of stripePaymentStates) {
        if (
          paymentState.stripeStatus === "requires_capture"
        ) {
          const cancelledPaymentIntent =
            await stripe.paymentIntents.cancel(
              paymentState.paymentIntentId,
              {},
              {
                idempotencyKey: `release-authorization-${paymentState.paymentId}`,
              }
            );

          if (
            cancelledPaymentIntent.status !== "canceled"
          ) {
            return NextResponse.json(
              {
                success: false,
                message: `Stripe did not release the authorization successfully. Current status: ${cancelledPaymentIntent.status}.`,
              },
              { status: 400 }
            );
          }
        }
      }

      /*
       * Stripe operations succeeded. Now synchronize database records
       * and cancel the booking together.
       */
      const cancelledBooking =
        await prisma.$transaction(async (tx) => {
          for (const paymentState of stripePaymentStates) {
            await tx.payment.update({
              where: {
                id: paymentState.paymentId,
              },
              data: {
                status: PaymentStatus.CANCELLED,
                cancelledAt: new Date(),
              },
            });
          }

          return tx.booking.update({
            where: {
              id: bookingId,
            },
            data: {
              status: BookingStatus.CANCELLED,
            },
            include: {
              userProfile: true,
              payments: {
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
          });
        });

      const notificationResult =
        await notifyBookingStatusChanged({
          phone: cancelledBooking.userProfile.phone,
          email: cancelledBooking.userProfile.email,
          customerName:
            cancelledBooking.userProfile.fullName,
          status: BookingStatus.CANCELLED,
        });

      if (
        !notificationResult.smsSent ||
        !notificationResult.emailSent
      ) {
        console.warn(
          "BOOKING_CANCELLED_NOTIFICATION_PARTIAL_FAILURE",
          {
            bookingId: cancelledBooking.id,
            smsSent: notificationResult.smsSent,
            emailSent: notificationResult.emailSent,
          }
        );
      }

      console.log(
        "BOOKING_CANCELLED_AUTHORIZATION_RELEASED",
        {
          bookingId: cancelledBooking.id,
          releasedPaymentIds: stripePaymentStates.map(
            (payment) => payment.paymentId
          ),
        }
      );

      return NextResponse.json({
        success: true,
        message:
          authorizedPayments.length > 0
            ? "Booking cancelled and card authorization released successfully."
            : "Booking cancelled successfully.",
        data: cancelledBooking,
      });
    }

    /*
     * Standard status update for Pending, Confirmed,
     * Assigned, and Completed.
     */
    const booking = await prisma.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: nextStatus,
      },
      include: {
        userProfile: true,
        payments: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const notificationResult =
      await notifyBookingStatusChanged({
        phone: booking.userProfile.phone,
        email: booking.userProfile.email,
        customerName:
          booking.userProfile.fullName,
        status: nextStatus,
      });

    if (
      !notificationResult.smsSent ||
      !notificationResult.emailSent
    ) {
      console.warn(
        "BOOKING_STATUS_NOTIFICATION_PARTIAL_FAILURE",
        {
          bookingId: booking.id,
          status: nextStatus,
          smsSent: notificationResult.smsSent,
          emailSent: notificationResult.emailSent,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Booking status updated successfully.",
      data: booking,
    });
  } catch (error) {
    console.error("ADMIN_BOOKING_STATUS_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while updating the booking.",
      },
      { status: 500 }
    );
  }
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
}
