import { NextResponse } from "next/server";
import {
  AdditionalAuthorizationStatus,
  BookingStatus,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

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
          booking: true,
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
      authorization.status ===
      AdditionalAuthorizationStatus.CANCELLED
    ) {
      return NextResponse.json({
        success: true,
        alreadyCancelled: true,
        message:
          "This authorization request has already been removed.",
      });
    }

    if (
      authorization.status ===
      AdditionalAuthorizationStatus.AUTHORIZED
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This request has already been authorized and can no longer be removed.",
        },
        { status: 400 }
      );
    }

    if (
      authorization.status ===
      AdditionalAuthorizationStatus.EXPIRED
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This authorization request has already expired.",
        },
        { status: 400 }
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
            "This authorization request cannot be removed in its current state.",
        },
        { status: 400 }
      );
    }

    if (
      authorization.booking.status ===
      BookingStatus.CANCELLED
    ) {
      const cancelledRequest =
        await prisma.additionalAuthorization.update({
          where: {
            id: authorization.id,
          },
          data: {
            status:
              AdditionalAuthorizationStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });

      return NextResponse.json({
        success: true,
        message:
          "The pending authorization request has been removed.",
        data: cancelledRequest,
      });
    }

    const cancelledRequest =
      await prisma.additionalAuthorization.update({
        where: {
          id: authorization.id,
        },
        data: {
          status:
            AdditionalAuthorizationStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

    console.log(
      "ADDITIONAL_AUTHORIZATION_CANCELLED",
      {
        requestId: cancelledRequest.id,
        bookingId: cancelledRequest.bookingId,
        additionalAmount:
          cancelledRequest.additionalAmount,
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "The pending authorization request has been removed. The customer link is no longer valid.",
      data: cancelledRequest,
    });
  } catch (error) {
    console.error(
      "CANCEL_ADDITIONAL_AUTHORIZATION_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while removing the authorization request.",
      },
      { status: 500 }
    );
  }
}
