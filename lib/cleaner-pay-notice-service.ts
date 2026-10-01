import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/sendgrid";
import { PAY_NOTICE_VERSION, payNoticeSnapshot, type PayNoticeInput } from "@/lib/cleaner-pay-notice";

export class PayNoticeError extends Error {}

export const noticeHash = (value: string) => createHash("sha256").update(value).digest("hex");
const tokenHash = (value: string) => /^[A-Za-z0-9_-]{43}$/.test(value) ? noticeHash(value) : null;
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
function signingUrl(token: string) {
  const host = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  const base = process.env.VERCEL_ENV === "preview" && host ? `https://${host}` : process.env.NEXT_PUBLIC_APP_URL;
  if (!base?.startsWith("https://")) throw new PayNoticeError("The website URL is not configured.");
  return new URL(`/professional/pay-notice/${token}`, base).toString();
}

export async function preparePayNotice(input: PayNoticeInput) {
  const professional = await prisma.professionalProfile.findUnique({ where: { id: input.professionalId }, select: { id: true, fullName: true, email: true, status: true } });
  if (!professional || professional.status !== "APPROVED") throw new PayNoticeError("Approve the cleaner before preparing their pay notice.");
  const snapshot = payNoticeSnapshot(input, professional.fullName);
  return { professional, snapshot, hash: noticeHash(snapshot) };
}

export async function issuePayNotice(input: PayNoticeInput, expectedHash: string, requestId: string) {
  const prepared = await preparePayNotice(input);
  if (prepared.hash !== expectedHash) throw new PayNoticeError("Details changed. Review the notice again before sending.");
  if (await prisma.cleanerPayNotice.findUnique({ where: { id: requestId } })) throw new PayNoticeError("This notice was already prepared. Check its status below before creating another.");
  const token = randomBytes(32).toString("base64url");
  // Resolve the host before saving a notice so configuration failure creates no orphan.
  const url = signingUrl(token);
  const notice = await prisma.cleanerPayNotice.create({ data: {
    id: requestId, employeeName: prepared.professional.fullName, professionalId: input.professionalId, primaryLanguage: input.primaryLanguage,
    effectiveDate: input.effectiveDate, version: PAY_NOTICE_VERSION,
    snapshot: prepared.snapshot, snapshotHash: prepared.hash,
    tokenHash: noticeHash(token), expiresAt: new Date(Date.now() + 30 * 86400000),
  } });
  const emailSent = await sendSigningEmail(notice, prepared.professional.email, url);
  return { id: notice.id, emailSent, signingUrl: url };
}

export async function getPayNotice(token: string) {
  const hash = tokenHash(token);
  if (!hash) return null;
  return prisma.cleanerPayNotice.findFirst({
    where: { tokenHash: hash, professional: { status: "APPROVED" }, OR: [{ expiresAt: { gt: new Date() } }, { signedAt: { not: null } }] },
    include: { professional: { select: { fullName: true, email: true } } },
  });
}

export async function signPayNotice(token: string, name: string, primaryLanguage: "en" | "es", hash: string, ip: string, userAgent: string) {
  const notice = await getPayNotice(token);
  if (!notice || notice.signedAt) throw new PayNoticeError("This notice is already signed or the link has expired.");
  if (notice.primaryLanguage !== primaryLanguage) throw new PayNoticeError("Contact SoHo for a notice in your primary language before signing.");
  if (notice.snapshotHash !== hash || noticeHash(notice.snapshot) !== hash) throw new PayNoticeError("Reload the notice before signing.");
  const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalize(name) !== normalize(notice.employeeName)) throw new PayNoticeError(`Enter the name saved on your application: ${notice.employeeName}`);
  const signedAt = new Date();
  const result = await prisma.cleanerPayNotice.updateMany({ where: {
    id: notice.id, tokenHash: tokenHash(token)!, signedAt: null, expiresAt: { gt: signedAt },
    professional: { status: "APPROVED" }, snapshotHash: hash,
  }, data: { signedAt, signedName: notice.employeeName, signedIp: ip.slice(0, 100), signedUserAgent: userAgent.slice(0, 500) } });
  if (result.count !== 1) throw new PayNoticeError("This notice is already signed or the link has expired.");
  const receipt = `SoHo Cleaning Group — signed pay notice\nSigned by: ${notice.employeeName}\nSigned at: ${signedAt.toISOString()}\nVersion: ${notice.version}\nSHA-256: ${hash}\n\n${notice.snapshot}`;
  let emailSent = false;
  try { emailSent = await sendEmail({ to: [notice.professional.email], subject: "Your signed SoHo pay notice — keep this copy", text: receipt, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(receipt)}</pre>` }); }
  catch (error) { console.error("PAY_NOTICE_RECEIPT_FAILED", error); }
  if (emailSent) await prisma.cleanerPayNotice.update({ where: { id: notice.id }, data: { receiptSentAt: new Date() } });
  return { emailSent };
}

async function sendSigningEmail(notice: { id: string; employeeName: string; primaryLanguage: string }, email: string, url: string) {
  const text = `Hello ${notice.employeeName},\n\nPlease review and acknowledge your individual SoHo pay notice before your first shift. It includes your hourly rates, overtime calculation, payday, and employer details. ${notice.primaryLanguage === "es" ? "Your notice includes English and Spanish copies." : "Your notice is in English."}\n\nRead and sign: ${url}\n\nThe private link expires in 30 days. If your primary language or any details are incorrect, contact SoHo before signing. You can print or save the notice and will receive a signed copy by email.\n\nAndy & the SoHo Cleaning Group team`;
  let sent = false;
  try { sent = await sendEmail({ to: [email], subject: "Your SoHo pay notice — review and acknowledge", text, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(text)}</pre>` }); }
  catch (error) { console.error("PAY_NOTICE_EMAIL_FAILED", error); }
  if (sent) await prisma.cleanerPayNotice.update({ where: { id: notice.id }, data: { sentAt: new Date() } });
  return sent;
}

export async function resendPayNotice(id: string) {
  const notice = await prisma.cleanerPayNotice.findUnique({ where: { id }, include: { professional: { select: { email: true, status: true } } } });
  if (!notice || notice.professional.status !== "APPROVED") throw new PayNoticeError("This cleaner must be approved before emailing their notice.");
  if (notice.signedAt) {
    const receipt = `SoHo Cleaning Group — signed pay notice\nSigned by: ${notice.signedName}\nSigned at: ${notice.signedAt.toISOString()}\nVersion: ${notice.version}\nSHA-256: ${notice.snapshotHash}\n\n${notice.snapshot}`;
    const emailSent = await sendEmail({ to: [notice.professional.email], subject: "Your signed SoHo pay notice — keep this copy", text: receipt, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(receipt)}</pre>` });
    if (emailSent) await prisma.cleanerPayNotice.update({ where: { id }, data: { receiptSentAt: new Date() } });
    return { emailSent, signingUrl: null };
  }
  const token = randomBytes(32).toString("base64url");
  const url = signingUrl(token);
  const result = await prisma.cleanerPayNotice.updateMany({ where: { id, signedAt: null, tokenHash: notice.tokenHash }, data: { tokenHash: noticeHash(token), expiresAt: new Date(Date.now() + 30 * 86400000) } });
  if (result.count !== 1) throw new PayNoticeError("The notice changed. Refresh the page before resending.");
  const emailSent = await sendSigningEmail(notice, notice.professional.email, url);
  return { emailSent, signingUrl: url };
}
