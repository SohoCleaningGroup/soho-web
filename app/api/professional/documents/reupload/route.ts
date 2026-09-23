import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ProfessionalIdDocumentStatus,
  ProfessionalIdDocumentType,
} from "@prisma/client";
import { z } from "zod";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

const reuploadSchema = z.object({
  token: z.string().min(32).max(256),
  idDocumentType: z.enum(ProfessionalIdDocumentType),
  idDocumentFrontUrl: z.string().min(1).max(1000),
  idDocumentBackUrl: z.string().min(1).max(1000),
});

export async function POST(req: Request) {
  try {
    const rejected =
      rejectCrossOrigin(req) || rejectOversizedRequest(req, 16 * 1024);
    if (rejected) return rejected;

    const limited = rateLimit(
      `document-reupload:${getClientIp(req)}`,
      8,
      30 * 60 * 1000
    );
    if (limited) return limited;

    const parsed = reuploadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid reupload token.",
        },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const professional = await prisma.professionalProfile.findFirst({
      where: {
        idDocumentReuploadToken: body.token,
        idDocumentReuploadExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!professional) {
      return NextResponse.json(
        {
          success: false,
          message: "This reupload link is invalid or expired.",
        },
        { status: 404 }
      );
    }

    const expectedFront = `reuploads/${professional.id}/id-front-`;
    const expectedBack = `reuploads/${professional.id}/id-back-`;
    if (
      !body.idDocumentFrontUrl.startsWith(expectedFront) ||
      !body.idDocumentBackUrl.startsWith(expectedBack)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid uploaded file reference." },
        { status: 400 }
      );
    }

    await prisma.professionalProfile.update({
      where: {
        id: professional.id,
      },
      data: {
        idDocumentType:
          body.idDocumentType as ProfessionalIdDocumentType,

        idDocumentFrontUrl: body.idDocumentFrontUrl,
        idDocumentBackUrl: body.idDocumentBackUrl,

        idDocumentStatus: ProfessionalIdDocumentStatus.PENDING,

        idDocumentReuploadToken: null,
        idDocumentReuploadExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Documents submitted successfully.",
    });
  } catch (error) {
    console.error("PROFESSIONAL_DOCUMENT_REUPLOAD_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while updating documents.",
      },
      { status: 500 }
    );
  }
}
