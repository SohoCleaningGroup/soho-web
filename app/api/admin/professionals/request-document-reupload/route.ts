import { NextResponse } from "next/server";
import { ProfessionalIdDocumentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyProfessionalDocumentReuploadRequested } from "@/lib/customer-notifications";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

const REUPLOAD_EXPIRY_DAYS = 7;

export async function POST(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;

    const body = await req.json();

    const professionalId =
      typeof body.professionalId === "string"
        ? body.professionalId.trim()
        : "";

    if (!professionalId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Professional ID is required.",
        },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();

    const expiresAt = new Date();

    expiresAt.setDate(
      expiresAt.getDate() +
        REUPLOAD_EXPIRY_DAYS
    );

    const professional =
      await prisma.professionalProfile.update({
        where: {
          id: professionalId,
        },
        data: {
          idDocumentStatus:
            ProfessionalIdDocumentStatus.REUPLOAD_REQUESTED,
          idDocumentReuploadToken: token,
          idDocumentReuploadExpiresAt:
            expiresAt,
        },
      });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const reuploadUrl =
      `${appUrl}/professional/documents/reupload/${token}`;

    /*
     * The reupload request is already persisted before notifications
     * are sent. SMS and email delivery are therefore non-destructive:
     * a provider failure does not invalidate the secure request.
     */
    const notificationResult =
      await notifyProfessionalDocumentReuploadRequested({
        phone: professional.phone,
        email: professional.email,
        professionalName:
          professional.fullName,
        reuploadUrl,
        expiresInDays:
          REUPLOAD_EXPIRY_DAYS,
      });

    /*
     * Both channels failing does not invalidate the reupload request.
     * Return the secure URL so the admin still has a recovery path.
     */
    if (
      !notificationResult.smsSent &&
      !notificationResult.emailSent
    ) {
      console.error(
        "PROFESSIONAL_DOCUMENT_REUPLOAD_NOTIFICATION_FAILED",
        {
          professionalId:
            professional.id,
          smsSent:
            notificationResult.smsSent,
          emailSent:
            notificationResult.emailSent,
        }
      );

      return NextResponse.json(
        {
          success: false,
          requestCreated: true,
          message:
            "The document reupload request was created, but we were unable to notify the professional by SMS or email.",
          data: {
            reuploadUrl,
            expiresAt,
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

    if (
      !notificationResult.smsSent ||
      !notificationResult.emailSent
    ) {
      console.warn(
        "PROFESSIONAL_DOCUMENT_REUPLOAD_NOTIFICATION_PARTIAL_FAILURE",
        {
          professionalId:
            professional.id,
          smsSent:
            notificationResult.smsSent,
          emailSent:
            notificationResult.emailSent,
        }
      );
    }

    console.log(
      "PROFESSIONAL_DOCUMENT_REUPLOAD_REQUESTED",
      {
        professionalId: professional.id,
        expiresAt,
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
          ? "Document reupload request sent successfully by SMS and email."
          : notificationResult.smsSent
            ? "Document reupload request sent successfully by SMS."
            : "Document reupload request sent successfully by email.",
      data: {
        reuploadUrl,
        expiresAt,
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
      "REQUEST_DOCUMENT_REUPLOAD_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while requesting the document reupload.",
      },
      { status: 500 }
    );
  }
}
