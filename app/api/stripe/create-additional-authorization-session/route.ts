import { NextResponse } from "next/server";
import {
  AdditionalAuthorizationStatus,
  BookingStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

export async function POST(req: Request) {
  try {
    const rejected =
      rejectCrossOrigin(req) || rejectOversizedRequest(req, 8 * 1024);
    if (rejected) return rejected;

    const limited = rateLimit(
      `additional-checkout:${getClientIp(req)}`,
      10,
      30 * 60 * 1000
    );
    if (limited) return limited;

    const formData = await req.formData();

    const token = String(formData.get("token") || "").trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Authorization token is required.",
        },
        { status: 400 }
      );
    }

    const authorization =
      await prisma.additionalAuthorization.findUnique({
        where: {
          token,
        },
        include: {
          payment: true,
          booking: {
            include: {
              userProfile: true,
              payments: {
                orderBy: {
                  createdAt: "asc",
                },
              },
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

    if (authorization.booking.status === BookingStatus.CANCELLED) {
      return redirectToAuthorizationPage({
        req,
        token,
        query: "error=booking-cancelled",
      });
    }

    if (
      authorization.status ===
      AdditionalAuthorizationStatus.AUTHORIZED
    ) {
      return redirectToAuthorizationPage({
        req,
        token,
        query: "already_authorized=1",
      });
    }

    if (
      authorization.status ===
      AdditionalAuthorizationStatus.CANCELLED
    ) {
      return redirectToAuthorizationPage({
        req,
        token,
        query: "error=request-cancelled",
      });
    }

    const hasExpired =
      authorization.status ===
        AdditionalAuthorizationStatus.EXPIRED ||
      authorization.expiresAt <= new Date();

    if (hasExpired) {
      if (
        authorization.status ===
        AdditionalAuthorizationStatus.PENDING
      ) {
        await prisma.additionalAuthorization.update({
          where: {
            id: authorization.id,
          },
          data: {
            status: AdditionalAuthorizationStatus.EXPIRED,
          },
        });
      }

      return redirectToAuthorizationPage({
        req,
        token,
        query: "error=request-expired",
      });
    }

    if (
      authorization.status !==
      AdditionalAuthorizationStatus.PENDING
    ) {
      return redirectToAuthorizationPage({
        req,
        token,
        query: "error=request-unavailable",
      });
    }

    const amountInCents = Math.round(
      authorization.additionalAmount * 100
    );

    if (
      !Number.isFinite(amountInCents) ||
      amountInCents <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The additional authorization amount is invalid.",
        },
        { status: 400 }
      );
    }

    const currency =
      authorization.payment?.currency ||
      authorization.booking.payments[0]?.currency ||
      "USD";

    const normalizedCurrency = currency.toLowerCase();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      getRequestOrigin(req) ||
      "http://localhost:3000";

    const reasonDescription = authorization.reason
      ? ` Reason: ${authorization.reason.slice(0, 300)}`
      : "";

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",

          payment_method_types: ["card"],

          customer_email:
            authorization.booking.userProfile.email,

          success_url:
            `${appUrl}/authorize-additional/${token}` +
            "?session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            `${appUrl}/authorize-additional/${token}` +
            "?cancelled=1",

          payment_intent_data: {
            capture_method: "manual",

            description:
              "Additional cleaning service authorization",

            metadata: {
              paymentFlow: "ADDITIONAL_AUTHORIZATION",
              additionalAuthorizationId: authorization.id,
              bookingId: authorization.bookingId,
              sourcePaymentId:
                authorization.paymentId || "",
              authorizationToken: authorization.token,
            },
          },

          line_items: [
            {
              quantity: 1,

              price_data: {
                currency: normalizedCurrency,

                unit_amount: amountInCents,

                product_data: {
                  name: "Additional Cleaning Authorization",

                  description:
                    `Additional authorization for your SoHo Cleaning Group booking.${reasonDescription}`,
                },
              },
            },
          ],

          custom_text: {
            submit: {
              message:
                "Your card will be authorized for this additional amount but will not be charged until the cleaning service is completed.",
            },
          },

          metadata: {
            paymentFlow: "ADDITIONAL_AUTHORIZATION",
            additionalAuthorizationId: authorization.id,
            bookingId: authorization.bookingId,
            sourcePaymentId:
              authorization.paymentId || "",
            authorizationToken: authorization.token,
            additionalAmount:
              authorization.additionalAmount.toFixed(2),
          },
        },
        {
          /*
           * Prevent repeated button clicks from creating multiple
           * Checkout Sessions for the same authorization request.
           */
          idempotencyKey:
            `additional-authorization-session-${authorization.id}`,
        }
      );

    if (!session.url) {
      throw new Error(
        "Stripe did not return a Checkout Session URL."
      );
    }

    console.log(
      "ADDITIONAL_AUTHORIZATION_CHECKOUT_CREATED",
      {
        additionalAuthorizationId: authorization.id,
        bookingId: authorization.bookingId,
        checkoutSessionId: session.id,
        additionalAmount:
          authorization.additionalAmount,
        currency: normalizedCurrency,
      }
    );

    /*
     * The customer submitted a normal HTML form, so redirect them
     * directly to Stripe Checkout.
     */
    return NextResponse.redirect(session.url, {
      status: 303,
    });
  } catch (error) {
    console.error(
      "CREATE_ADDITIONAL_AUTHORIZATION_SESSION_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to open secure additional authorization checkout.",
      },
      { status: 500 }
    );
  }
}

function redirectToAuthorizationPage({
  req,
  token,
  query,
}: {
  req: Request;
  token: string;
  query: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    getRequestOrigin(req) ||
    "http://localhost:3000";

  return NextResponse.redirect(
    `${appUrl}/authorize-additional/${token}?${query}`,
    {
      status: 303,
    }
  );
}

function getRequestOrigin(req: Request) {
  try {
    return new URL(req.url).origin;
  } catch {
    return null;
  }
}
