export const CHECKOUT_DRAFT_KEY = "soho-checkout-draft-v1";
const MAX_AGE_MS = 60 * 60 * 1000;

export function serializeCheckoutDraft<T extends { preferredDate: Date | null }>(data: T, countryCode: string, now = Date.now()) {
  return JSON.stringify({ data, countryCode, savedAt: now });
}

export function parseCheckoutDraft<T extends { preferredDate: Date | null }>(raw: string | null, initial: T, now = Date.now()): { data: T; countryCode: string } | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.savedAt !== "number" || draft.savedAt > now || now - draft.savedAt > MAX_AGE_MS || !draft.data || typeof draft.data !== "object") return null;
    const data = { ...initial };
    for (const key of Object.keys(initial) as (keyof T)[]) {
      if (key === "preferredDate") continue;
      const value = draft.data[key];
      const fallback = initial[key];
      if (Array.isArray(fallback)) {
        if (Array.isArray(value) && value.every((item) => typeof item === "string")) data[key] = value as T[keyof T];
      } else if (typeof value === typeof fallback) {
        data[key] = value;
      }
    }
    const date = typeof draft.data.preferredDate === "string" ? new Date(draft.data.preferredDate) : null;
    data.preferredDate = date && !Number.isNaN(date.getTime()) ? date : null;
    return { data, countryCode: typeof draft.countryCode === "string" && /^\+\d{1,4}$/.test(draft.countryCode) ? draft.countryCode : "+1" };
  } catch {
    return null;
  }
}
