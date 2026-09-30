import { ReferralError, reserveReferral, releaseReferral } from "@/lib/referrals/service";
import { BOOKING_SMS_CONSENT_VERSION } from "@/lib/messaging/sms-consent";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  calculateCleaningPrice,
  type CleaningType,
  type HomeSize,
} from "@/lib/pricing/cleaning-pricing";
import {
  PHONE_VERIFICATION_COOKIE,
  isPhoneVerified,
  normalizePhone,
} from "@/lib/security/phone-verification";
import {
  getClientIp,
  rateLimit,
  rejectCrossOrigin,
  rejectOversizedRequest,
} from "@/lib/security/request";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { CHECKOUT_RETURN_COOKIE, checkoutReturnCookieOptions, createCheckoutReturnToken } from "@/lib/security/checkout-return";
import {
  estimateCleaningDurationMinutes,
  getBookingCapacity,
  getTravelBufferMinutes,
  hasBookingSlotStarted,
  isSlotAvailable,
  type BookingTimeSlot,
} from "@/lib/scheduling/booking-availability";

const addOnOptions = [
  { id: "INSIDE_FRIDGE", label: "Inside Fridge Cleaning", price: 40 },
] as const;

const checkoutSchema = z.object({
  referralCode: z.string().trim().max(60).default(""),
  fullName: z.string().trim().min(2).max(120),
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  address: z.string().trim().min(3).max(200),
  apartment: z.string().trim().max(50).optional().default(""),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  zipCode: z.string().trim().regex(/^\d{5}(?:-\d{4})?$/),
  cleaningType: z.enum([
    "SOHO_SIGNATURE",
    "SOHO_SIGNATURE_DEEP",
    "MOVE_IN_MOVE_OUT",
    "RECURRING",
  ]),
  homeSize: z.enum(["1BHK", "2BHK", "3BHK", "4BHK"]),
  totalSqft: z.coerce.number().int().min(100).max(20_000),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(0).max(20),
  kitchens: z.coerce.number().int().min(0).max(10),
  frequency: z.enum(["ONE_TIME", "WEEKLY", "BI_WEEKLY", "MONTHLY"]),
  preferredDate: z.string().datetime().nullable(),
  preferredTime: z.enum([
    "08:00-10:00",
    "10:00-12:00",
    "12:00-14:00",
    "14:00-16:00",
    "16:00-18:00",
  ]),
  hasPets: z.boolean(),
  acceptedSmsConsent: z.boolean().default(false),
  selectedAddOns: z.array(z.string()).max(10),
  // Stripe metadata values are limited to 500 characters. The webhook uses
  // this value to create the booking, so reject longer notes before opening
  // Checkout instead of letting Stripe fail the session request.
  specialNotes: z.string().trim().max(500).optional().default(""),
});

export async function POST(request: Request) {
  let referralUseId: string | null = null;
  let slotHoldId: string | null = null;
  let checkoutSessionId: string | null = null;

  try {
    const rejected =
      rejectCrossOrigin(request) || rejectOversizedRequest(request, 32 * 1024);
    if (rejected) return rejected;

    const limited = rateLimit(
      `checkout:${getClientIp(request)}`,
      8,
      30 * 60 * 1000
    );
    if (limited) return limited;

    if (process.env.VERCEL_ENV === "preview" && !/^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || "")) return NextResponse.json({ success: false, message: "Test checkout is unavailable until test payments are configured." }, { status: 503 });
    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      const labels: Record<string, string> = {
        fullName: "your full name",
        email: "your email address",
        phone: "your phone number",
        address: "the street address",
        city: "the city",
        state: "the state",
        zipCode: "the ZIP code",
        cleaningType: "the cleaning service",
        homeSize: "the home size",
        totalSqft: "the total square footage",
        bedrooms: "the bedroom count",
        bathrooms: "the bathroom count",
        kitchens: "the kitchen count",
        frequency: "the cleaning frequency",
        preferredDate: "the booking date",
        preferredTime: "the booking time",
        selectedAddOns: "the add-ons",
        specialNotes: "special notes",
      };
      const label = typeof field === "string" ? labels[field] : undefined;
      return NextResponse.json(
        {
          success: false,
          message: label
            ? `Please check ${label}.`
            : "Please review your booking details.",
        },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const phone = normalizePhone(body.phone);
    if (!(await isPhoneVerified(phone))) {
      return NextResponse.json(
        { success: false, message: "Phone verification is required." },
        { status: 403 }
      );
    }

    const preferredDate = body.preferredDate ? new Date(body.preferredDate) : null;
    if (!preferredDate || Number.isNaN(preferredDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Select a valid future date." },
        { status: 400 }
      );
    }

    if (hasBookingSlotStarted(preferredDate, body.preferredTime)) {
      return NextResponse.json(
        { success: false, message: "Select a future booking time." },
        { status: 400 }
      );
    }

    const requestedDay = preferredDate.getUTCDay();
    if (requestedDay === 0 || requestedDay === 6) {
      return NextResponse.json(
        {
          success: false,
          message: "Bookings are available Monday through Friday.",
        },
        { status: 400 }
      );
    }

    const dayStart = new Date(preferredDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const requestedDurationMinutes = estimateCleaningDurationMinutes({
      cleaningType: body.cleaningType as CleaningType,
      homeSize: body.homeSize as HomeSize,
      totalSqft: body.totalSqft,
      selectedAddOns: body.selectedAddOns,
    });
    const bookingCapacity = getBookingCapacity();
    const travelBufferMinutes = getTravelBufferMinutes();

    const checkoutExpiresAt = Math.floor(Date.now() / 1000) + 35 * 60;
    const holdExpiresAt = new Date((checkoutExpiresAt + 5 * 60) * 1000);

    const holdResult = await prisma.$transaction(async (tx) => {
      // Serialize availability checks for this service date so two
      // near-simultaneous customers cannot both claim the last crew slot.
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${dayStart.toISOString()}))
      `;

      await tx.bookingSlotHold.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      });

      const [activeBookings, activeHolds] = await Promise.all([
        tx.booking.findMany({
          where: {
            preferredDate: { gte: dayStart, lt: dayEnd },
            status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] },
          },
          select: {
            preferredTime: true,
            estimatedDurationMinutes: true,
          },
        }),
        tx.bookingSlotHold.findMany({
          where: {
            preferredDate: { gte: dayStart, lt: dayEnd },
            expiresAt: { gt: new Date() },
          },
          select: {
            preferredTime: true,
            estimatedDurationMinutes: true,
          },
        }),
      ]);

      const available = isSlotAvailable({
        requestedSlot: body.preferredTime as BookingTimeSlot,
        requestedDurationMinutes,
        intervals: [...activeBookings, ...activeHolds],
        capacity: bookingCapacity,
        travelBufferMinutes,
      });

      if (!available) {
        return null;
      }

      return tx.bookingSlotHold.create({
        data: {
          preferredDate,
          preferredTime: body.preferredTime,
          estimatedDurationMinutes: requestedDurationMinutes,
          expiresAt: holdExpiresAt,
        },
        select: { id: true },
      });
    });

    if (!holdResult) {
      return NextResponse.json(
        {
          success: false,
          code: "BOOKING_TIME_UNAVAILABLE",
          message:
            "That time is no longer available. Please choose another time.",
        },
        { status: 409 }
      );
    }

    slotHoldId = holdResult.id;

    const pricing = calculateCleaningPrice({
      cleaningType: body.cleaningType as CleaningType,
      homeSize: body.homeSize as HomeSize,
      totalSqft: body.totalSqft,
    });

    const selectedAddOns = addOnOptions.filter((addOn) =>
      body.selectedAddOns.includes(addOn.id)
    );
    const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
    const referral = await reserveReferral(body.referralCode, { ...body, phone }, pricing.total, holdExpiresAt);
    referralUseId = referral?.id || null;
    const finalTotal = Number((pricing.total + addOnTotal - (referral?.discountCents || 0) / 100).toFixed(2));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const addOnDescription = selectedAddOns.length
      ? ` Add-ons: ${selectedAddOns
          .map((addOn) => `${addOn.label} (+$${addOn.price})`)
          .join(", ")}.`
      : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      expires_at: checkoutExpiresAt,
      payment_intent_data: {
        capture_method: "manual",
        metadata: { bookingFlow: "CARD_PREAUTHORIZATION" },
      },
      customer_email: body.email,
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboarding/user`,
      custom_text: {
        submit: {
          message:
            "Your card will be securely authorized for the booking total. This may appear as a temporary pending hold. The payment will only be captured after your cleaning service is completed.",
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(finalTotal * 100),
            product_data: {
              name: `${pricing.serviceLabel} - ${pricing.homeSizeLabel}`,
              description: `Included area: ${pricing.includedSqft} sqft. Total area: ${pricing.totalSqft} sqft.${addOnDescription}${referral ? ` Referral discount: $${(referral.discountCents / 100).toFixed(2)}.` : ""}`,
            },
          },
        },
      ],
      metadata: {
        referralUseId: referral?.id || "",
        referralDiscountCents: String(referral?.discountCents || 0),
        acceptedSmsConsent: String(body.acceptedSmsConsent),
        smsConsentAt: body.acceptedSmsConsent ? new Date().toISOString() : "",
        smsConsentVersion: body.acceptedSmsConsent ? BOOKING_SMS_CONSENT_VERSION : "",
        fullName: body.fullName,
        email: body.email,
        phone,
        address: body.address,
        apartment: body.apartment,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        cleaningType: body.cleaningType,
        homeSize: body.homeSize,
        totalSqft: String(body.totalSqft),
        estimatedDurationMinutes: String(requestedDurationMinutes),
        bedrooms: String(body.bedrooms),
        bathrooms: String(body.bathrooms),
        kitchens: String(body.kitchens),
        frequency: body.frequency,
        preferredDate: body.preferredDate || "",
        preferredTime: body.preferredTime,
        hasPets: body.hasPets ? "true" : "false",
        selectedAddOns: selectedAddOns.map((addOn) => addOn.id).join(","),
        selectedAddOnLabels: selectedAddOns.map((addOn) => addOn.label).join(", "),
        addOnTotal: String(addOnTotal),
        specialNotes: body.specialNotes,
        calculatedTotal: String(finalTotal),
        paymentFlow: "MANUAL_CAPTURE",
      },
    });

    checkoutSessionId = session.id;
    if (referral) await prisma.referralUse.update({ where: { id: referral.id }, data: { checkoutSessionId: session.id } });

    try {
      await prisma.bookingSlotHold.update({
        where: { id: slotHoldId },
        data: { checkoutSessionId: session.id },
      });
    } catch (error) {
      await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
      throw error;
    }

    const response = NextResponse.json({ success: true, url: session.url });
    response.cookies.set(CHECKOUT_RETURN_COOKIE, createCheckoutReturnToken(session.id), checkoutReturnCookieOptions);
    response.cookies.set({
      name: PHONE_VERIFICATION_COOKIE,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    let safeToRelease = !checkoutSessionId;
    if (checkoutSessionId) {
      try { safeToRelease = (await stripe.checkout.sessions.expire(checkoutSessionId)).status === "expired"; }
      catch { safeToRelease = await stripe.checkout.sessions.retrieve(checkoutSessionId).then(session => session.status === "expired").catch(() => false); }
    }
    if (safeToRelease && slotHoldId) await prisma.bookingSlotHold.delete({ where: { id: slotHoldId } }).catch(() => undefined);
    if (safeToRelease && referralUseId) await releaseReferral({ id: referralUseId }).catch(() => undefined);
    if (error instanceof ReferralError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    console.error("CREATE_CHECKOUT_SESSION_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
