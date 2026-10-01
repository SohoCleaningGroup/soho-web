import { prisma } from "@/lib/prisma";
import { hasValidAdminSession } from "@/lib/security/admin-auth";
export async function GET(request: Request) {
  if (!(await hasValidAdminSession())) return new Response("Unauthorized", { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id.length > 100) return new Response("Notice not found", { status: 404 });
  const notice = await prisma.cleanerPayNotice.findUnique({ where: { id } });
  if (!notice) return new Response("Notice not found", { status: 404 });
  const text = `Created: ${notice.createdAt.toISOString()}\nSigned by: ${notice.signedName || "Not yet signed"}\nSigned at: ${notice.signedAt?.toISOString() || "Not yet signed"}\nVersion: ${notice.version}\nSHA-256: ${notice.snapshotHash}\n\n${notice.snapshot}`;
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": 'attachment; filename="soho-pay-notice.txt"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
