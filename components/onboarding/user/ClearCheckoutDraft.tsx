"use client";

import { useEffect } from "react";
import { CHECKOUT_DRAFT_KEY } from "@/lib/booking/checkout-draft";

export default function ClearCheckoutDraft() {
  useEffect(() => {
    try { sessionStorage.removeItem(CHECKOUT_DRAFT_KEY); } catch {}
    // Clear the completed checkout's return cookie before a new booking.
    void fetch("/api/stripe/return-from-checkout", { method: "POST" }).catch(() => undefined);
  }, []);
  return null;
}
