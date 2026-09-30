import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canEarnReward, discountCents, normalizeReferralCode } from "./rules";

export class ReferralError extends Error {}
type Identity = { email: string; phone: string; address: string; apartment: string; zipCode: string };
type Db = Prisma.TransactionClient;
const identityKey = (phone: string) => createHash("sha256").update(phone).digest("hex");
const household = (p: { address: string | null; apartment: string | null; zipCode: string | null }) =>
  [p.address, p.apartment, p.zipCode].map(v => (v || "").toLowerCase().replace(/[^a-z0-9]/g, "")).join("|");

export async function ensureReferralAccount(userProfileId: string) {
  return prisma.referralAccount.upsert({
    where: { userProfileId }, update: {},
    create: { userProfileId, code: `SOHO-${randomBytes(6).toString("hex").toUpperCase()}`, rewardCode: `REWARD-${randomBytes(16).toString("hex").toUpperCase()}` },
  });
}

async function eligible(tx: Db, code: string, identity: Identity) {
  const normalized = normalizeReferralCode(code);
  const account = await tx.referralAccount.findFirst({ where: { OR: [{ code: normalized }, { rewardCode: normalized }] }, include: { userProfile: true } });
  if (!account) throw new ReferralError("This code is unavailable. Please check it and try again.");
  const email = identity.email.trim().toLowerCase();
  if (normalized === account.rewardCode) {
    if (account.userProfile.email.toLowerCase() !== email || account.userProfile.phone !== identity.phone) throw new ReferralError("Use your reward with the same email and verified phone as your previous booking.");
    const sources = await tx.referralUse.findMany({ where: { accountId: account.id, kind: "FRIEND", status: "EARNED", rewardClaim: null }, orderBy: { createdAt: "asc" }, include: { booking: { include: { payments: true } } } });
    const source = sources.find(s => s.booking && canEarnReward(s.booking));
    if (!source) throw new ReferralError("There is no available earned reward for this code yet.");
    return { account, kind: "REWARD", rewardSourceId: source.id, customerKey: null };
  }
  if (account.userProfile.email.toLowerCase() === email || account.userProfile.phone === identity.phone || household(account.userProfile) === household(identity)) throw new ReferralError("Referral discounts are for a friend's first clean. Use your earned reward code for your own booking.");
  const previous = await tx.booking.count({ where: { status: { not: "CANCELLED" }, userProfile: { OR: [{ email: { equals: email, mode: "insensitive" } }, { phone: identity.phone }] } } });
  const customerKey = identityKey(identity.phone);
  if (previous || await tx.referralUse.findUnique({ where: { customerKey } })) throw new ReferralError("The friend discount is available for a new customer's first booking only.");
  return { account, kind: "FRIEND", rewardSourceId: null, customerKey };
}

export async function quoteReferral(code: string, identity: Identity, serviceAmount: number) {
  return prisma.$transaction(async tx => {
    const result = await eligible(tx, code, identity);
    return { discountCents: discountCents(serviceAmount), kind: result.kind };
  });
}

export async function reserveReferral(code: string, identity: Identity, serviceAmount: number, expiresAt: Date) {
  if (!code.trim()) return null;
  return prisma.$transaction(async tx => {
    // One lock covers both identity and reward claims, including different codes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('soho-referral-reservations'))`;
    const { account, ...fields } = await eligible(tx, code, identity);
    return tx.referralUse.create({ data: { ...fields, accountId: account.id, discountCents: discountCents(serviceAmount), expiresAt } });
  });
}

export async function releaseReferral(where: { checkoutSessionId: string } | { id: string } | { bookingId: string }) {
  await prisma.referralUse.updateMany({ where: { ...where, status: { in: ["RESERVED", "BOOKED"] } }, data: { status: "RELEASED", customerKey: null, rewardSourceId: null } });
}

export async function bindReferral(useId: string | undefined, checkoutSessionId: string, bookingId: string) {
  if (!useId) return;
  const bound = await prisma.referralUse.updateMany({ where: { id: useId, checkoutSessionId, status: "RESERVED" }, data: { bookingId, status: "BOOKED" } });
  if (!bound.count && !(await prisma.referralUse.findFirst({ where: { id: useId, checkoutSessionId, bookingId } }))) throw new Error("Referral reservation does not match checkout.");
}

export async function reconcileReferral(bookingId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('soho-referral-reservations'))`;
    const use = await tx.referralUse.findUnique({ where: { bookingId }, include: { booking: { include: { payments: true } } } });
    if (!use?.booking || use.status !== "BOOKED" || !canEarnReward(use.booking)) return;
    await tx.referralUse.update({ where: { id: use.id }, data: { status: use.kind === "FRIEND" ? "EARNED" : "REDEEMED" } });
  });
}

export function referralLink(code: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/user?ref=${encodeURIComponent(code)}`;
}
