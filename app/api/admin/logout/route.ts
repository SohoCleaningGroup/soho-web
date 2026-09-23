import { NextResponse } from "next/server";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
} from "@/lib/security/admin-auth";
import { rejectCrossOrigin } from "@/lib/security/request";

export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req);
  if (rejected) return rejected;

  const response = NextResponse.redirect(new URL("/admin/login", req.url), {
    status: 303,
  });

  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    ...adminSessionCookieOptions,
    maxAge: 0,
  });

  return response;
}
