import { NextResponse } from "next/server";
import { ProfessionalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rejectUnauthorizedAdminRequest } from "@/lib/security/admin-auth";

export async function PATCH(req: Request) {
  try {
    const rejected = await rejectUnauthorizedAdminRequest(req);
    if (rejected) return rejected;

    const body = await req.json();

    if (!body.professionalId || !body.status) {
      return NextResponse.json(
        { success: false, message: "Professional ID and status are required." },
        { status: 400 }
      );
    }

    if (!Object.values(ProfessionalStatus).includes(body.status)) {
      return NextResponse.json(
        { success: false, message: "Invalid professional status." },
        { status: 400 }
      );
    }

    const professional = await prisma.professionalProfile.update({
      where: {
        id: body.professionalId,
      },
      data: {
        status: body.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Professional status updated successfully.",
      data: professional,
    });
  } catch (error) {
    console.error("ADMIN_PROFESSIONAL_STATUS_ERROR", error);

    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}
