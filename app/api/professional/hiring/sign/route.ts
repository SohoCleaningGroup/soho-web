import { NextResponse } from "next/server";
import { z } from "zod";
import { signHiringTerms } from "@/lib/cleaner-hiring-signature";

const requestSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  name: z.string().trim().min(2).max(120),
  agreed: z.literal(true),
  language: z.enum(["en", "es"]),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ message: "Invalid signing request." }, { status: 403 });
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ message: "Enter your full name and agree before signing." }, { status: 400 });
  try {
    const result = await signHiringTerms(body.data.token, body.data.name, body.data.language, request.headers.get("user-agent") || "", request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "");
    return NextResponse.json({ success: true, emailSent: result.emailSent });
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Unable to sign these terms." }, { status: 409 });
  }
}
