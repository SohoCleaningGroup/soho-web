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

const addOnOptions = [
  { id: "INSIDE_FRIDGE", label: "Inside Fridge Cleaning", price: 40 },
] as const;

const checkoutSchema = z.object({
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
  selectedAddOns: z.array(z.string()).max(10),
  // Stripe metadata values are limited to 500 characters. The webhook uses
  // this value to create the booking, so reject longer notes before opening
  // Checkout instead of letting Stripe fail the session request.
  specialNotes: z.string().trim().max(500).optional().default(""),
});

export async function POST(request: Request) {
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

    const parsed = checkoutSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Please review your booking details." },
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
    if (!preferredDate || preferredDate.getTime() < Date.now() - 60 * 60 * 1000) {
      return NextResponse.json(
        { success: false, message: "Select a valid future date." },
        { status: 400 }
      );
    }

    // One-cleaner staging protection: prevent the same or adjacent 2-hour
    // arrival window from being sold when an active booking already exists.
    // Adjacent windows are blocked to preserve travel time between jobs.
    const dayStart = new Date(preferredDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const slots = [
      "08:00-10:00",
      "10:00-12:00",
      "12:00-14:00",
      "14:00-16:00",
      "16:00-18:00",
    ] as const;
    const requestedSlotIndex = slots.indexOf(body.preferredTime);
    const blockedSlots = slots.filter(
      (_, index) => Math.abs(index - requestedSlotIndex) <= 1
    );

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        preferredDate: { gte: dayStart, lt: dayEnd },
        preferredTime: { in: [...blockedSlots] },
        status: { in: ["PENDING", "CONFIRMED", "ASSIGNED"] },
      },
      select: { id: true },
    });

    if (conflictingBooking) {
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

    const pricing = calculateCleaningPrice({
      cleaningType: body.cleaningType as CleaningType,
      homeSize: body.homeSize as HomeSize,
      totalSqft: body.totalSqft,
    });

    const selectedAddOns = addOnOptions.filter((addOn) =>
      body.selectedAddOns.includes(addOn.id)
    );
    const addOnTotal = selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);
    const finalTotal = Number((pricing.total + addOnTotal).toFixed(2));
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const addOnDescription = selectedAddOns.length
      ? ` Add-ons: ${selectedAddOns
          .map((addOn) => `${addOn.label} (+$${addOn.price})`)
          .join(", ")}.`
      : "";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
              description: `Included area: ${pricing.includedSqft} sqft. Total area: ${pricing.totalSqft} sqft.${addOnDescription}`,
            },
          },
        },
      ],
      metadata: {
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

    const response = NextResponse.json({ success: true, url: session.url });
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
    console.error("CREATE_CHECKOUT_SESSION_ERROR", error);
    return NextResponse.json(
      { success: false, message: "Unable to create checkout session." },
      { status: 500 }
    );
  }
}
