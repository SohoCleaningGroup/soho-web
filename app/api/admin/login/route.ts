import { NextResponse } from "next/server";
import { z } from "zod";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  secureStringEqual,
} from "@/lib/security/admin-auth";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";

const loginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(256),
});

export async function POST(req: Request) {
  try {
    const rejected =
      rejectCrossOrigin(req) ||
      rejectOversizedRequest(req, 8 * 1024) ||
      rateLimit(`admin-login:${getClientIp(req)}`, 8, 15 * 60 * 1000);
    if (rejected) return rejected;

    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (
      !adminEmail ||
      !adminPassword ||
      !sessionSecret ||
      sessionSecret.length < 32
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin login is temporarily unavailable.",
        },
        { status: 500 }
      );
    }

    if (
      !secureStringEqual(parsed.data.email, adminEmail) ||
      !secureStringEqual(parsed.data.password, adminPassword)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "Admin logged in successfully.",
    });

    response.cookies.set({
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(),
      ...adminSessionCookieOptions,
    });

    return response;
  } catch (error) {
    console.error("ADMIN_LOGIN_ERROR", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while logging in.",
      },
      { status: 500 }
    );
  }
}
