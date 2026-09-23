import { NextResponse } from "next/server";
import { AdditionalAuthorizationStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyAdditionalAuthorizationRequested } from "@/lib/customer-notifications";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
const REQUEST_EXPIRY_HOURS = 24;

export async function POST(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;

    const body = await req.json();

    const requestId =
      typeof body.requestId === "string"
        ? body.requestId.trim()
        : "";

    if (!requestId) {
      return NextResponse.json(
        {
          success: false,
          message: "Request ID is required.",
        },
        { status: 400 }
      );
    }

    const authorization =
      await prisma.additionalAuthorization.findUnique({
        where: {
          id: requestId,
        },
        include: {
          booking: {
            include: {
              userProfile: true,
              payments: true,
            },
          },
        },
      });

    if (!authorization) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization request not found.",
        },
        { status: 404 }
      );
    }

    if (
      authorization.status !==
      AdditionalAuthorizationStatus.PENDING
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This authorization request is no longer pending.",
        },
        { status: 400 }
      );
    }

    if (authorization.expiresAt <= new Date()) {
      await prisma.additionalAuthorization.update({
        where: {
          id: authorization.id,
        },
        data: {
          status:
            AdditionalAuthorizationStatus.EXPIRED,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "This authorization request has expired.",
        },
        { status: 400 }
      );
    }

    const totalAuthorized = Number(
      authorization.booking.payments
        .filter((payment) =>
          ["AUTHORIZED", "PAID"].includes(payment.status)
        )
        .reduce(
          (total, payment) =>
            total + payment.authorizedAmount,
          0
        )
        .toFixed(2)
    );

    const finalAmount = Number(
      (
        totalAuthorized +
        authorization.additionalAmount
      ).toFixed(2)
    );

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    /*
     * Important:
     * Resending does NOT create a new token or request.
     * The customer receives the same secure authorization URL.
     */
    const authorizationLink =
      `${appUrl}/authorize-additional/${authorization.token}`;

    const notificationResult =
      await notifyAdditionalAuthorizationRequested({
        phone:
          authorization.booking.userProfile.phone,
        email:
          authorization.booking.userProfile.email,
        customerName:
          authorization.booking.userProfile.fullName,
        additionalAmount:
          authorization.additionalAmount,
        finalAmount,
        reason:
          authorization.reason || undefined,
        authorizationLink,
        expiresInHours: REQUEST_EXPIRY_HOURS,
      });

    /*
     * The existing authorization request remains valid even if both
     * notification providers fail, so the admin can try resending again.
     */
    if (
      !notificationResult.smsSent &&
      !notificationResult.emailSent
    ) {
      console.error(
        "ADDITIONAL_AUTHORIZATION_RESEND_NOTIFICATION_FAILED",
        {
          requestId: authorization.id,
          bookingId: authorization.bookingId,
          phone:
            authorization.booking.userProfile.phone,
          email:
            authorization.booking.userProfile.email,
        }
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "The authorization request is still active, but we were unable to resend it by SMS or email.",
          data: {
            requestId: authorization.id,
            authorizationLink,
            additionalAmount:
              authorization.additionalAmount,
            finalAmount,
            expiresAt: authorization.expiresAt,
            notifications: {
              smsSent:
                notificationResult.smsSent,
              emailSent:
                notificationResult.emailSent,
            },
          },
        },
        { status: 502 }
      );
    }

    /*
     * One successful channel is enough to treat the resend as delivered.
     */
    if (
      !notificationResult.smsSent ||
      !notificationResult.emailSent
    ) {
      console.warn(
        "ADDITIONAL_AUTHORIZATION_RESEND_PARTIAL_FAILURE",
        {
          requestId: authorization.id,
          bookingId: authorization.bookingId,
          phone:
            authorization.booking.userProfile.phone,
          email:
            authorization.booking.userProfile.email,
          smsSent:
            notificationResult.smsSent,
          emailSent:
            notificationResult.emailSent,
        }
      );
    }

    console.log(
      "ADDITIONAL_AUTHORIZATION_RESENT",
      {
        requestId: authorization.id,
        bookingId: authorization.bookingId,
        phone:
          authorization.booking.userProfile.phone,
        email:
          authorization.booking.userProfile.email,
        notifications: {
          smsSent:
            notificationResult.smsSent,
          emailSent:
            notificationResult.emailSent,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message:
        notificationResult.smsSent &&
        notificationResult.emailSent
          ? "Authorization link has been resent successfully by SMS and email."
          : notificationResult.smsSent
            ? "Authorization link has been resent successfully by SMS."
            : "Authorization link has been resent successfully by email.",
      data: {
        requestId: authorization.id,
        additionalAmount:
          authorization.additionalAmount,
        finalAmount,
        expiresAt: authorization.expiresAt,
        notifications: {
          smsSent:
            notificationResult.smsSent,
          emailSent:
            notificationResult.emailSent,
        },
      },
    });
  } catch (error) {
    console.error(
      "RESEND_ADDITIONAL_AUTHORIZATION_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while resending the authorization link.",
      },
      { status: 500 }
    );
  }
}
