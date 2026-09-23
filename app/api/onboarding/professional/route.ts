import { NextResponse } from "next/server";
import {
  ProfessionalIdDocumentStatus,
  ProfessionalIdDocumentType,
  ProfessionalStatus,
} from "@prisma/client";
import { z } from "zod";

import { notifyProfessionalApplicationReceived } from "@/lib/customer-notifications";
import { prisma } from "@/lib/prisma";
import {
  PHONE_VERIFICATION_COOKIE,
  isPhoneVerified,
  normalizePhone,
  phoneStorageKey,
} from "@/lib/security/phone-verification";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

const applicationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  profileImageUrl: z.string().max(1000).optional().default(""),
  experienceYears: z.coerce.number().int().min(0).max(80).nullable().optional(),
  servicesOffered: z.array(z.string().trim().min(1).max(60)).max(10),
  serviceAreas: z.array(z.string().trim().min(1).max(100)).max(25),
  availability: z.array(z.string().trim().min(1).max(30)).max(14),
  hasOwnSupplies: z.boolean(),
  hasTransport: z.boolean(),
  bio: z.string().trim().max(3000).optional().default(""),
  idDocumentType: z.enum(ProfessionalIdDocumentType),
  idDocumentFrontUrl: z.string().min(1).max(1000),
  idDocumentBackUrl: z.string().min(1).max(1000),
});

export async function POST(request: Request) {
  try {
    const rejected =
      rejectCrossOrigin(request) || rejectOversizedRequest(request, 64 * 1024);
    if (rejected) return rejected;

    const limited = rateLimit(
      `professional-application:${getClientIp(request)}`,
      4,
      60 * 60 * 1000
    );
    if (limited) return limited;

    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Please review the application fields." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const phone = normalizePhone(data.phone);
    if (!(await isPhoneVerified(phone))) {
      return NextResponse.json(
        { success: false, message: "Phone verification is required." },
        { status: 403 }
      );
    }

    const ownerKey = phoneStorageKey(phone);
    const expectedFront = `applications/${ownerKey}/id-front-`;
    const expectedBack = `applications/${ownerKey}/id-back-`;
    const expectedProfile = `profiles/${ownerKey}/profile-`;

    if (
      !data.idDocumentFrontUrl.startsWith(expectedFront) ||
      !data.idDocumentBackUrl.startsWith(expectedBack) ||
      (data.profileImageUrl && !data.profileImageUrl.startsWith(expectedProfile))
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid uploaded file reference." },
        { status: 400 }
      );
    }

    const existing = await prisma.professionalProfile.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: "An application already exists for this email. Please contact us for updates.",
        },
        { status: 409 }
      );
    }

    const professional = await prisma.professionalProfile.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        phone,
        profileImageUrl: data.profileImageUrl || null,
        experienceYears: data.experienceYears ?? null,
        servicesOffered: data.servicesOffered,
        serviceAreas: data.serviceAreas,
        availability: data.availability,
        hasOwnSupplies: data.hasOwnSupplies,
        hasTransport: data.hasTransport,
        bio: data.bio || null,
        status: ProfessionalStatus.PENDING,
        idDocumentType: data.idDocumentType,
        idDocumentFrontUrl: data.idDocumentFrontUrl,
        idDocumentBackUrl: data.idDocumentBackUrl,
        idDocumentStatus: ProfessionalIdDocumentStatus.PENDING,
      },
      select: { id: true, fullName: true, email: true, phone: true },
    });

    const notificationResult = await notifyProfessionalApplicationReceived({
      phone: professional.phone,
      email: professional.email,
      professionalName: professional.fullName,
    });

    const response = NextResponse.json({
      success: true,
      message: "Professional onboarding submitted successfully.",
      data: { id: professional.id },
      notifications: {
        smsSent: notificationResult.smsSent,
        emailSent: notificationResult.emailSent,
      },
    });

    response.cookies.set({
      name: PHONE_VERIFICATION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("PROFESSIONAL_ONBOARDING_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Unable to submit the application." },
      { status: 500 }
    );
  }
}
