import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { notifyAdminsOfProfessionalApplication } from "@/lib/admin-professional-notifications";

const schema = z.object({ professionalId: z.string().min(1).max(100) });

export async function POST(request: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(request);
    if (rejected) return rejected;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Choose an applicant." }, { status: 400 });

    const professional = await prisma.professionalProfile.findUnique({
      where: { id: parsed.data.professionalId },
      select: { id: true },
    });
    if (!professional) return NextResponse.json({ success: false, message: "Applicant not found." }, { status: 404 });

    const reviewUrl = new URL(`/admin/dashboard/professionals/${encodeURIComponent(professional.id)}`, request.url).toString();
    const sent = await notifyAdminsOfProfessionalApplication({ applicationId: professional.id, reviewUrl });
    if (!sent) return NextResponse.json({ success: false, message: "The admin email was not accepted. Check the email settings." }, { status: 502 });
    return NextResponse.json({ success: true, message: "Admin application notice sent." });
  } catch (error) {
    console.error("ADMIN_PROFESSIONAL_RESEND_NOTICE_ERROR", error);
    return NextResponse.json({ success: false, message: "Could not resend the admin notice." }, { status: 500 });
  }
}
