import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { lockedJob, PHOTO_BUCKET } from "@/lib/jobs/service";
import { canUpload } from "@/lib/jobs/rules";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { rateLimit, rejectCrossOrigin, rejectOversizedRequest, getClientIp } from "@/lib/security/request";
export async function POST(request: Request) {
  const rejected = rejectCrossOrigin(request) || rejectOversizedRequest(request, 4 * 1024 * 1024) || rateLimit(`job-photo:${getClientIp(request)}`, 30);
  if (rejected) return rejected;
  let path: string | null = null;
  try {
    const form = await request.formData();
    const token = String(form.get("token") || ""); const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG or WebP photo under 3 MB.");
    // Decode and re-encode to reject bogus images and remove GPS/EXIF metadata.
    const input = Buffer.from(await file.arrayBuffer());
    const image = sharp(input, { limitInputPixels: 40_000_000, animated: false });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Unsupported photo format.");
    const bytes = await image.rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    await lockedJob(token, false, async (tx, job) => {
      if (!canUpload(job.status, job.reviewStatus)) throw new Error("Photos can be uploaded only before sending a review or while resolving attention items.");
      if (job.photos.length >= 12) throw new Error("This job already has 12 photos.");
      path = `${job.id}/${randomUUID()}.jpg`;
      const { error } = await getSupabaseAdmin().storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) throw new Error("Photo storage is unavailable. Try again.");
      await tx.jobPhoto.create({ data: { assignmentId: job.id, path } });
    });
    return NextResponse.json({ success: true, message: "Photo uploaded." });
  } catch (error) {
    if (path) await getSupabaseAdmin().storage.from(PHOTO_BUCKET).remove([path]).catch(() => {});
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Photo upload failed." }, { status: 400 });
  }
}
