import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
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
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);
const PROFILE_TYPES = new Set(["image/png", "image/jpeg"]);

export async function POST(request: Request) {
  try {
    const rejected =
      rejectCrossOrigin(request) || rejectOversizedRequest(request, 6 * 1024 * 1024);
    if (rejected) return rejected;

    const limited = rateLimit(
      `professional-upload:${getClientIp(request)}`,
      12,
      30 * 60 * 1000
    );
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = String(formData.get("kind") || "");
    const flow = String(formData.get("flow") || "application");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "A file is required." },
        { status: 400 }
      );
    }

    const isProfile = kind === "profile";
    const isDocument = kind === "id-front" || kind === "id-back";
    if (!isProfile && !isDocument) {
      return NextResponse.json(
        { success: false, message: "Invalid upload type." },
        { status: 400 }
      );
    }

    const allowedTypes = isProfile ? PROFILE_TYPES : DOCUMENT_TYPES;
    const maxBytes = isProfile ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes) {
      return NextResponse.json(
        { success: false, message: "Invalid file type or size." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidSignature(bytes, file.type)) {
      return NextResponse.json(
        { success: false, message: "The file content does not match its type." },
        { status: 400 }
      );
    }

    let ownerKey: string;
    let folder: string;

    if (flow === "reupload") {
      if (!isDocument) {
        return NextResponse.json(
          { success: false, message: "Invalid reupload type." },
          { status: 400 }
        );
      }

      const token = String(formData.get("token") || "").trim();
      const professional = await prisma.professionalProfile.findFirst({
        where: {
          idDocumentReuploadToken: token,
          idDocumentReuploadExpiresAt: { gt: new Date() },
        },
        select: { id: true },
      });

      if (!professional) {
        return NextResponse.json(
          { success: false, message: "This reupload link is invalid or expired." },
          { status: 403 }
        );
      }

      ownerKey = professional.id;
      folder = "reuploads";
    } else {
      const phone = normalizePhone(String(formData.get("phone") || ""));
      if (!phone || !(await isPhoneVerified(phone))) {
        return NextResponse.json(
          { success: false, message: "Phone verification is required." },
          { status: 403 }
        );
      }

      ownerKey = phoneStorageKey(phone);
      folder = isProfile ? "profiles" : "applications";
    }

    const extension = extensionFor(file.type);
    const side = isDocument ? kind : "profile";
    const path = `${folder}/${ownerKey}/${side}-${randomUUID()}.${extension}`;
    const bucket = isProfile ? "professional-profiles" : "professional-documents";
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      cacheControl: isProfile ? "86400" : "3600",
      contentType: file.type,
      upsert: false,
    });

    if (error) throw error;

    if (isProfile) {
      const { data, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 30 * 60);
      if (signedUrlError) throw signedUrlError;

      return NextResponse.json({
        success: true,
        value: path,
        previewUrl: data.signedUrl,
      });
    }

    return NextResponse.json({ success: true, value: path });
  } catch (error) {
    console.error("PROFESSIONAL_UPLOAD_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

function extensionFor(type: string) {
  if (type === "application/pdf") return "pdf";
  if (type === "image/png") return "png";
  return "jpg";
}

function hasValidSignature(bytes: Uint8Array, type: string) {
  if (type === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  if (type === "image/png") {
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return png.every((value, index) => bytes[index] === value);
  }
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
