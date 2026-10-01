import { NextResponse } from "next/server";
import {
  ProfessionalIdDocumentStatus,
  ProfessionalIdDocumentType,
  ProfessionalStatus,
} from "@prisma/client";
import { z } from "zod";

import { notifyProfessionalApplicationReceived } from "@/lib/customer-notifications";
import { prisma } from "@/lib/prisma";
import { cleanerScreeningSchema, buildCleanerScreeningSnapshot } from "@/lib/cleaner-application";
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

const applicationSchema = cleanerScreeningSchema.extend({
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
      console.warn("PROFESSIONAL_APPLICATION_VALIDATION", parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        code: issue.code,
      })));
      const field = String(parsed.error.issues[0]?.path[0] || "");
      const fieldMessages: Record<string, string> = {
        fullName: "Please enter your full name (at least two characters).",
        email: "Please enter a valid email address.",
        phone: "Please check your phone number.",
        experienceYears: "Please enter a number of years of experience between 0 and 80.",
        screeningAnswers: "Please answer all ten Yes or No questions.",
        kitchenScenarioAnswer: "Please choose one answer for the dishes-in-the-sink question.",
        idDocumentType: "Please choose your ID document type.",
        idDocumentFrontUrl: "Please upload the first ID photo again.",
        idDocumentBackUrl: "Please upload the second ID photo again.",
      };
      return NextResponse.json(
        { success: false, message: fieldMessages[field] || "Please review your application details and try again.", field },
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
      console.warn("PROFESSIONAL_APPLICATION_FILE_REFERENCE", {
        front: !data.idDocumentFrontUrl.startsWith(expectedFront),
        back: !data.idDocumentBackUrl.startsWith(expectedBack),
        profile: !!data.profileImageUrl && !data.profileImageUrl.startsWith(expectedProfile),
      });
      return NextResponse.json(
        { success: false, message: "One of your uploaded photos no longer matches your verified phone. Please go back and upload your photos again." },
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
        screeningResponses: buildCleanerScreeningSnapshot(data),
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
      message: "Thank you! Your application has been received.",
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
