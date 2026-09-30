export const REFERRAL_TERMS = "Give 10%, get 10%: your friend saves on their first clean, and you earn a discount for your next clean once theirs is completed and paid. Each discount is capped at $30, applies to cleaning services only, and cannot be combined with another discount. One reward per booking. No cash value. Rewards are unrelated to Google reviews.";

export function discountCents(serviceAmount: number): number {
  if (!Number.isFinite(serviceAmount) || serviceAmount <= 0) throw new Error("Invalid service price.");
  return Math.min(3000, Math.round(Math.round(serviceAmount * 100) / 10));
}

export function canEarnReward(booking: { status: string; payments: { status: string; capturedAmount: number | null; isAdditionalAuthorization: boolean }[] }): boolean {
  return booking.status === "COMPLETED" &&
    booking.payments.some(p => !p.isAdditionalAuthorization && p.status === "PAID" && (p.capturedAmount || 0) > 0) &&
    !booking.payments.some(p => ["AUTHORIZED", "PENDING", "REFUNDED"].includes(p.status));
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase();
}
