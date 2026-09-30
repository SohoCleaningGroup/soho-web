import { NextResponse } from "next/server";
import { ProfessionalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";
import { sendCleanerApprovalEmail } from "@/lib/professional-approval";

const requestSchema = z.object({
  professionalId: z.string().min(1).max(100),
  status: z.enum(ProfessionalStatus).optional(),
  resendApprovalEmail: z.boolean().optional(),
}).refine(value => value.resendApprovalEmail === true ? !value.status : Boolean(value.status));

export async function PATCH(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, message: "Choose a valid status or resend the approval email." }, { status: 400 });
    const body = parsed.data;
    let changed = false;
    if (body.status) {
      // Only the request that changes the status sends the automatic welcome email.
      const result = await prisma.professionalProfile.updateMany({ where: { id: body.professionalId, status: { not: body.status } }, data: { status: body.status } });
      changed = result.count > 0;
    }
    const professional = await prisma.professionalProfile.findUnique({ where: { id: body.professionalId }, select: { id: true, fullName: true, email: true, status: true, hiringTermsSignedAt: true } });
    if (!professional) return NextResponse.json({ success: false, message: "Applicant not found." }, { status: 404 });
    if (body.resendApprovalEmail && professional.status !== ProfessionalStatus.APPROVED) return NextResponse.json({ success: false, message: "Approve this applicant before sending an approval email." }, { status: 409 });
    const shouldSend = professional.status === ProfessionalStatus.APPROVED && (changed || body.resendApprovalEmail === true);
    const emailSent = shouldSend ? await sendCleanerApprovalEmail(professional) : null;
    const message = emailSent === false
      ? "The cleaner is approved, but the email could not be sent. Use Resend approval email to try again."
      : emailSent === true
        ? "Approval email and handbook link sent."
        : "Professional status updated successfully.";
    return NextResponse.json({ success: true, message, data: professional, emailSent });
  } catch (error) {
    console.error("ADMIN_PROFESSIONAL_STATUS_ERROR", error);
    return NextResponse.json({ success: false, message: "Unable to update the application. Please try again." }, { status: 500 });
  }
}
