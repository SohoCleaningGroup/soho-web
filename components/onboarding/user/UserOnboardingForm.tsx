"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import Link from "next/link";
import "react-datepicker/dist/react-datepicker.css";

import {
    calculateCleaningPrice,
    type CleaningType,
    type HomeSize,
} from "@/lib/pricing/cleaning-pricing";

type FormData = {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    state: string;
    zipCode: string;
    cleaningType: string;
    homeSize: string;
    totalSqft: string;
    bedrooms: string;
    bathrooms: string;
    kitchens: string;
    frequency: string;
    preferredDate: Date | null;
    preferredTime: string;
    specialNotes: string;
    hasPets: boolean;
    acceptedPolicies: boolean;
    acceptedSmsConsent: boolean;
    selectedAddOns: string[];
    addOnTotal: number;
};

const initialData: FormData = {
    fullName: "",
    email: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    state: "",
    zipCode: "",
    cleaningType: "",
    homeSize: "",
    totalSqft: "",
    bedrooms: "",
    bathrooms: "",
    kitchens: "",
    frequency: "",
    preferredDate: null,
    preferredTime: "",
    specialNotes: "",
    hasPets: false,
    acceptedPolicies: false,
    acceptedSmsConsent: false,
    selectedAddOns: [],
    addOnTotal: 0,
};

const steps = [
    "Service",
    "Personal",
    "Address",
    "Home Details",
    "Schedule",
    "Review",
];

const timeSlots = [
    { label: "8:00 AM - 10:00 AM", value: "08:00-10:00" },
    { label: "10:00 AM - 12:00 PM", value: "10:00-12:00" },
    { label: "12:00 PM - 2:00 PM", value: "12:00-14:00" },
    { label: "2:00 PM - 4:00 PM", value: "14:00-16:00" },
    { label: "4:00 PM - 6:00 PM", value: "16:00-18:00" },
];

const serviceOptions = [
    {
        label: "SoHo Signature",
        value: "SOHO_SIGNATURE",
        description:
            "Ideal for regular home upkeep and maintaining a clean, polished living space.",
        included: [
            "Kitchen counters, sink, faucet, appliance exteriors, stovetop, cabinet fronts, trash removal, vacuum/mop floors.",
            "Bathrooms: toilet, sink, vanity, shower/tub, mirrors, trash removal, floors cleaned.",
            "Living areas and bedrooms: dusting, vacuuming, mopping, bed making if linens are left out, common surfaces wiped.",
        ],
        notIncluded: [
            "Inside oven cleaning",
            "Refrigerator interior cleaning",
            "Interior windows",
            "Laundry",
            "Dishwashing",
            "Organizing",
            "Carpet shampooing",
            "Post-construction cleanup",
            "Hoarding-level cleanup",
        ],
        disclaimer:
            "Residential cleaning only. We do not perform remediation, restoration, biohazard cleanup, pest-related cleanup, exterior window cleaning, heavy lifting, or work requiring specialty licensing.",
    },
    {
        label: "SoHo Signature Deep",
        value: "SOHO_SIGNATURE_DEEP",
        description:
            "A more detailed cleaning for homes needing extra attention beyond routine upkeep.",
        included: [
            "Everything included in SoHo Signature.",
            "Baseboards, doors and frames, detailed dusting, shower glass detailing, light switches.",
            "Kitchen grease/detail work and behind movable furniture when safe.",
        ],
        notIncluded: [
            "Inside oven cleaning unless added on",
            "Refrigerator interior cleaning unless added on",
            "Interior windows unless added on",
            "Laundry",
            "Dishwashing",
            "Organizing",
            "Carpet shampooing",
            "Post-construction cleanup",
            "Hoarding-level cleanup",
        ],
        disclaimer:
            "Residential cleaning only. We do not perform mold remediation, biohazard cleanup, pest infestation cleanup, heavy furniture moving, exterior window cleaning, unsafe ladder work, appliance repair, plumbing/electrical work, hazardous waste handling, or fire/smoke/water damage restoration.",
    },
    {
        label: "Move In / Move Out",
        value: "MOVE_IN_MOVE_OUT",
        description:
            "Designed for residential turnover preparation before moving in or after moving out.",
        included: [
            "Kitchen: inside/outside cabinets, refrigerator, oven, stovetop and hood detail, countertops sanitized, sink and faucet polished, backsplash cleaned, baseboards and floors cleaned.",
            "Bathrooms: shower/tub detailing, toilet disinfected, vanity and drawers cleaned, mirrors polished, light buildup removal, cabinet interiors wiped, baseboards and floors cleaned.",
            "Living areas and bedrooms: baseboards, window sills/tracks, closets, doors/frames, light switches/outlets, detailed dusting, floors, cobweb removal.",
        ],
        notIncluded: [
            "Full wall washing",
            "Ceiling washing",
            "Exterior windows",
            "Paint removal",
            "Construction debris/heavy dust",
            "Furniture moving",
            "Carpet extraction/shampooing",
            "Pest waste cleanup",
            "Mold remediation",
            "Hoarding cleanup",
        ],
        disclaimer:
            "Move-in/move-out cleaning is intended for standard residential turnover preparation and does not include remediation, restoration, hazardous-material handling, or heavy debris removal.",
    },
    {
        label: "Recurring Cleaning",
        value: "RECURRING",
        description:
            "Weekly, bi-weekly, or monthly maintenance cleaning for consistent upkeep.",
        included: [
            "Based on the SoHo Signature cleaning scope.",
            "Kitchen, bathroom, living area, and bedroom upkeep.",
            "Designed for homes that are cleaned on an ongoing schedule.",
        ],
        notIncluded: [
            "Deep cleaning tasks unless scheduled separately",
            "Inside oven cleaning",
            "Refrigerator interior cleaning",
            "Interior windows",
            "Laundry",
            "Dishwashing",
            "Organizing",
            "Carpet shampooing",
        ],
        disclaimer:
            "Recurring cleaning is intended for routine residential upkeep and does not include specialty cleaning, remediation, restoration, hazardous-material handling, or heavy lifting.",
    },
];

const addOnOptions = [
    {
        id: "INSIDE_FRIDGE",
        label: "Inside Fridge Cleaning",
        description: "Add interior refrigerator cleaning to your service.",
        price: 40,
    },
];

export default function UserOnboardingForm() {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpError, setOtpError] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);

    const [countryCode, setCountryCode] = useState("+1");

    const pricing =
        formData.cleaningType && formData.homeSize
            ? calculateCleaningPrice({
                  cleaningType: formData.cleaningType as CleaningType,
                  homeSize: formData.homeSize as HomeSize,
                  totalSqft: Number(formData.totalSqft),
              })
            : null;

    const selectedService = serviceOptions.find(
        (service) => service.value === formData.cleaningType
    );

    const isRecurringService = formData.cleaningType === "RECURRING";

    const selectedAddOns = addOnOptions.filter((addOn) =>
        formData.selectedAddOns.includes(addOn.id)
    );

    const addOnTotal = selectedAddOns.reduce(
        (sum, addOn) => sum + addOn.price,
        0
    );

    const finalTotal = pricing ? pricing.total + addOnTotal : 0;

    const toggleAddOn = (addOnId: string) => {
        setFormData((prev) => {
            const selectedAddOns = prev.selectedAddOns.includes(addOnId)
                ? prev.selectedAddOns.filter((id) => id !== addOnId)
                : [...prev.selectedAddOns, addOnId];

            const addOnTotal = addOnOptions
                .filter((addOn) => selectedAddOns.includes(addOn.id))
                .reduce((sum, addOn) => sum + addOn.price, 0);

            return {
                ...prev,
                selectedAddOns,
                addOnTotal,
            };
        });
    };

    const updateField = <K extends keyof FormData>(
        field: K,
        value: FormData[K]
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));

        if (field === "phone") {
            setIsPhoneVerified(false);
            setIsOtpSent(false);
            setOtpCode("");
            setOtpMessage("");
            setOtpError("");
        }
    };

    const nextStep = () => {
        if (step === 0) {
            if (!formData.cleaningType) {
                alert("Please select a cleaning service before continuing.");
                return;
            }

            if (!formData.acceptedPolicies) {
                alert("Please review and accept our policies before continuing.");
                return;
            }
        }

        if (step === 1) {
            if (!formData.acceptedSmsConsent) {
                alert(
                    "Please provide consent to receive transactional SMS messages before continuing."
                );
                return;
            }

            if (!isPhoneVerified) {
                alert("Please verify your phone number before continuing.");
                return;
            }
        }

        if (step === 3) {
            if (!formData.homeSize || !formData.totalSqft) {
                alert("Please complete home size and total area.");
                return;
            }

            if (isRecurringService && !formData.frequency) {
                alert("Please select cleaning frequency.");
                return;
            }
        }

        if (step === 4) {
            if (!formData.preferredDate || !formData.preferredTime) {
                alert("Please select preferred date and time.");
                return;
            }
        }

        setStep((prev) =>
            Math.min(prev + 1, steps.length - 1)
        );
    };

    const prevStep = () =>
        setStep((prev) => Math.max(prev - 1, 0));

    const submitForm = async () => {
        try {
            setIsSubmitting(true);

            const response = await fetch(
                "/api/stripe/create-checkout-session",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...formData,
                        phone: normalizePhone(),
                        frequency: isRecurringService
                            ? formData.frequency
                            : "ONE_TIME",
                        preferredDate: formData.preferredDate
                            ? formData.preferredDate.toISOString()
                            : null,
                        selectedAddOns: formData.selectedAddOns,
                        addOnTotal,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success || !result.url) {
                throw new Error(
                    result.message ||
                        "Unable to start card authorization."
                );
            }

            window.location.assign(result.url);
        } catch (error) {
            console.error(error);
            alert(
                "Unable to open secure card authorization. Please try again."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const normalizePhone = () => {
        const rawPhone = formData.phone
            .replace(/\s+/g, "")
            .trim();

        const cleanedPhone = rawPhone.startsWith(countryCode)
            ? rawPhone.slice(countryCode.length)
            : rawPhone.replace(/^\+\d{1,4}/, "");

        return `${countryCode}${cleanedPhone}`;
    };

    const sendOtp = async () => {
        if (!formData.acceptedSmsConsent) {
            setOtpError(
                "Please agree to receive transactional SMS messages before requesting a verification code."
            );
            return;
        }

        try {
            setIsSendingOtp(true);
            setOtpMessage("");
            setOtpError("");

            const phone = normalizePhone();

            const response = await fetch("/api/sms/send-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to send OTP"
                );
            }

            setIsOtpSent(true);
            setOtpMessage(
                "Verification code sent successfully."
            );
        } catch (error) {
            setOtpError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtp = async () => {
        try {
            setIsVerifyingOtp(true);
            setOtpMessage("");
            setOtpError("");

            const response = await fetch("/api/sms/verify-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    phone: normalizePhone(),
                    code: otpCode,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        "Invalid verification code"
                );
            }

            setIsPhoneVerified(true);
            setOtpMessage(
                "Phone number verified successfully."
            );
        } catch (error) {
            setOtpError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    if (isSuccess) {
        return (
            <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
                <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
                    <div className="relative rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-10 text-center shadow-[0_24px_80px_rgba(214,171,95,0.12)]">
                        <button
                            type="button"
                            onClick={() => {
                                setFormData(initialData);
                                setStep(0);
                                setIsSuccess(false);
                            }}
                            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-[#8f6b2f] text-[#d6ab5f] transition hover:bg-[#151008]"
                        >
                            ✕
                        </button>

                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#d6ab5f] bg-[#151008] text-4xl text-[#d6ab5f]">
                            ✓
                        </div>

                        <h1 className="font-serif text-4xl text-white">
                            Booking Request Received
                        </h1>

                        <p className="mt-4 text-[#cfc7b7]">
                            Thank you for choosing SoHo Cleaning Group.
                            Your booking request has been received
                            successfully.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
            <section className="mx-auto max-w-4xl">
                <div className="mb-10 text-center">
                    <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
                        Cleaning Booking
                    </p>

                    <h1 className="font-serif text-4xl text-white sm:text-5xl">
                        Book Your Premium Cleaning
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-[#d6d0c5]">
                        Tell us about your home, choose your
                        schedule, review your estimate, and securely
                        authorize your card to reserve the booking.
                    </p>
                </div>

                <div className="mb-8 grid grid-cols-6 gap-3">
                    {steps.map((item, index) => (
                        <div key={item}>
                            <div
                                className={`h-2 rounded-full ${
                                    index <= step
                                        ? "bg-[#d6ab5f]"
                                        : "bg-[#2a2419]"
                                }`}
                            />

                            <p
                                className={`mt-2 text-center text-xs ${
                                    index <= step
                                        ? "text-[#d6ab5f]"
                                        : "text-[#7e7464]"
                                }`}
                            >
                                {item}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-10">
                    {step === 0 && (
                        <div className="grid gap-6">
                            <div>
                                <p className="mb-3 text-sm font-medium text-[#d8d0c1]">
                                    Select Your Cleaning Service
                                </p>

                                <div className="grid gap-4 md:grid-cols-2">
                                    {serviceOptions.map(
                                        (service) => {
                                            const isSelected =
                                                formData.cleaningType ===
                                                service.value;

                                            return (
                                                <button
                                                    key={
                                                        service.value
                                                    }
                                                    type="button"
                                                    onClick={() =>
                                                        updateField(
                                                            "cleaningType",
                                                            service.value
                                                        )
                                                    }
                                                    className={`rounded-[24px] border p-5 text-left transition ${
                                                        isSelected
                                                            ? "border-[#d6ab5f] bg-[#151008] shadow-[0_18px_60px_rgba(214,171,95,0.12)]"
                                                            : "border-[#2f291d] bg-[#111111] hover:border-[#8f6b2f]"
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <h2 className="font-serif text-2xl text-white">
                                                                {
                                                                    service.label
                                                                }
                                                            </h2>

                                                            <p className="mt-3 text-sm leading-7 text-[#cfc7b7]">
                                                                {
                                                                    service.description
                                                                }
                                                            </p>
                                                        </div>

                                                        <span className="text-xl text-[#d6ab5f]">
                                                            {isSelected
                                                                ? "✓"
                                                                : "○"}
                                                        </span>
                                                    </div>
                                                </button>
                                            );
                                        }
                                    )}
                                </div>
                            </div>

                            {selectedService && (
                                <>
                                    <ServiceDetailsCard
                                        service={selectedService}
                                    />

                                    <div className="rounded-[24px] border border-[#3a2812] bg-[#111111] p-5">
                                        <p className="text-xs uppercase tracking-[0.24em] text-[#d6ab5f]">
                                            Optional Add-On Services
                                        </p>

                                        <p className="mt-3 text-sm leading-7 text-[#d8d0c1]">
                                            Add extra services to your
                                            booking. These will be added
                                            to your final total.
                                        </p>

                                        <div className="mt-5 grid gap-3">
                                            {addOnOptions.map(
                                                (addOn) => {
                                                    const isSelected =
                                                        formData.selectedAddOns.includes(
                                                            addOn.id
                                                        );

                                                    return (
                                                        <button
                                                            key={
                                                                addOn.id
                                                            }
                                                            type="button"
                                                            onClick={() =>
                                                                toggleAddOn(
                                                                    addOn.id
                                                                )
                                                            }
                                                            className={`rounded-2xl border px-5 py-4 text-left transition ${
                                                                isSelected
                                                                    ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
                                                                    : "border-[#2f291d] bg-[#0a0a0a] text-[#d8d0c1] hover:border-[#8f6b2f]"
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div>
                                                                    <p className="text-sm font-semibold">
                                                                        <span className="mr-2">
                                                                            {isSelected
                                                                                ? "✓"
                                                                                : "○"}
                                                                        </span>
                                                                        {
                                                                            addOn.label
                                                                        }
                                                                    </p>

                                                                    <p className="mt-2 text-sm leading-6 text-[#cfc7b7]">
                                                                        {
                                                                            addOn.description
                                                                        }
                                                                    </p>
                                                                </div>

                                                                <p className="shrink-0 font-serif text-xl text-[#d6ab5f]">
                                                                    +$
                                                                    {
                                                                        addOn.price
                                                                    }
                                                                </p>
                                                            </div>
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-[24px] border border-[#3a2812] bg-[#111111] p-5">
                                        <p className="text-sm leading-7 text-[#d8d0c1]">
                                            Before requesting a booking,
                                            please review our policies.
                                            By continuing, you
                                            acknowledge that you have
                                            read and agree to our{" "}
                                            <a
                                                href="/terms-and-conditions"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-[#d6ab5f] underline-offset-4 hover:underline"
                                            >
                                                Terms & Conditions
                                            </a>
                                            ,{" "}
                                            <a
                                                href="/privacy-policy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-[#d6ab5f] underline-offset-4 hover:underline"
                                            >
                                                Privacy Policy
                                            </a>{" "}
                                            and{" "}
                                            <a
                                                href="/refund-policy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-medium text-[#d6ab5f] underline-offset-4 hover:underline"
                                            >
                                                Refund Policy
                                            </a>
                                            .
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormData(
                                                    (prev) => ({
                                                        ...prev,
                                                        acceptedPolicies:
                                                            !prev.acceptedPolicies,
                                                    })
                                                )
                                            }
                                            className={`mt-5 flex w-full items-start gap-3 rounded-2xl border px-5 py-4 text-left text-sm transition ${
                                                formData.acceptedPolicies
                                                    ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
                                                    : "border-[#2f291d] bg-[#0a0a0a] text-[#d8d0c1] hover:border-[#8f6b2f]"
                                            }`}
                                        >
                                            <span className="mt-0.5">
                                                {formData.acceptedPolicies
                                                    ? "✓"
                                                    : "○"}
                                            </span>

                                            <span>
                                                I agree to the Terms &
                                                Conditions, Privacy
                                                Policy, and Refund
                                                Policy.
                                            </span>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="grid gap-5">
                            <Input
                                label="Full Name"
                                value={formData.fullName}
                                onChange={(value) =>
                                    updateField(
                                        "fullName",
                                        value
                                    )
                                }
                            />

                            <Input
                                label="Email Address"
                                type="email"
                                value={formData.email}
                                onChange={(value) =>
                                    updateField("email", value)
                                }
                            />

                            <div>
                                <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                                    Phone Number
                                </span>

                                <div className="flex overflow-hidden rounded-2xl border border-[#2f291d] bg-[#111111] focus-within:border-[#d6ab5f]">
                                    <select
                                        value={countryCode}
                                        onChange={(event) => {
                                            setCountryCode(
                                                event.target.value
                                            );
                                            setIsPhoneVerified(false);
                                            setIsOtpSent(false);
                                            setOtpCode("");
                                            setOtpMessage("");
                                            setOtpError("");
                                        }}
                                        className="border-r border-[#2f291d] bg-[#111111] px-4 text-sm text-white outline-none"
                                    >
                                        <option value="+1">
                                            🇺🇸 +1
                                        </option>
                                        <option value="+91">
                                            🇮🇳 +91
                                        </option>
                                        <option value="+44">
                                            🇬🇧 +44
                                        </option>
                                        <option value="+971">
                                            🇦🇪 +971
                                        </option>
                                    </select>

                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(event) =>
                                            updateField(
                                                "phone",
                                                event.target.value
                                            )
                                        }
                                        placeholder="6465300590"
                                        className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-[#8f8778]"
                                    />

                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        disabled={
                                            isSendingOtp ||
                                            !formData.phone ||
                                            !formData.acceptedSmsConsent ||
                                            isPhoneVerified
                                        }
                                        className="min-w-[120px] border-l border-[#2f291d] px-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isSendingOtp
                                            ? "Sending..."
                                            : isPhoneVerified
                                              ? "Verified"
                                              : "Send OTP"}
                                    </button>
                                </div>

                                <div className="mt-4 rounded-[20px] border border-[#3a2812] bg-[#0c0a07] p-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormData(
                                                (prev) => ({
                                                    ...prev,
                                                    acceptedSmsConsent:
                                                        !prev.acceptedSmsConsent,
                                                })
                                            )
                                        }
                                        className="flex w-full items-start gap-3 text-left"
                                    >
                                        <span
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                                                formData.acceptedSmsConsent
                                                    ? "border-[#d6ab5f] bg-[#d6ab5f] text-black"
                                                    : "border-[#5b5141] text-transparent"
                                            }`}
                                        >
                                            ✓
                                        </span>

                                        <span className="text-xs leading-6 text-[#b8ad9a]">
                                            I agree to receive
                                            transactional text messages
                                            from SoHo Cleaning Group
                                            regarding my booking,
                                            verification, service
                                            updates, cleaner assignment,
                                            payment authorization,
                                            payment status,
                                            cancellations, and other
                                            service-related
                                            communications. Message
                                            frequency varies. Message
                                            and data rates may apply.
                                            Reply STOP to opt out or
                                            HELP for help. Consent is
                                            not a condition of purchase.
                                            See our{" "}
                                            <a
                                                href="/terms-and-conditions"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                className="font-medium text-[#d6ab5f] underline-offset-4 hover:underline"
                                            >
                                                Terms & Conditions
                                            </a>{" "}
                                            and{" "}
                                            <a
                                                href="/privacy-policy"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                className="font-medium text-[#d6ab5f] underline-offset-4 hover:underline"
                                            >
                                                Privacy Policy
                                            </a>
                                            .
                                        </span>
                                    </button>
                                </div>

                                {!formData.acceptedSmsConsent && (
                                    <p className="mt-3 text-xs leading-6 text-[#8f8778]">
                                        SMS consent is required before
                                        we can send your phone
                                        verification code.
                                    </p>
                                )}

                                {isOtpSent &&
                                    !isPhoneVerified && (
                                        <div className="mt-4 flex overflow-hidden rounded-2xl border border-[#2f291d] bg-[#111111] focus-within:border-[#d6ab5f]">
                                            <input
                                                type="text"
                                                value={otpCode}
                                                onChange={(event) =>
                                                    setOtpCode(
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                placeholder="Enter OTP"
                                                className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-[#8f8778]"
                                            />

                                            <button
                                                type="button"
                                                onClick={verifyOtp}
                                                disabled={
                                                    isVerifyingOtp ||
                                                    !otpCode
                                                }
                                                className="min-w-[120px] bg-[#d6ab5f] px-4 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isVerifyingOtp
                                                    ? "Verifying..."
                                                    : "Verify"}
                                            </button>
                                        </div>
                                    )}

                                {otpMessage && (
                                    <p className="mt-3 text-sm text-green-300">
                                        {otpMessage}
                                    </p>
                                )}

                                {otpError && (
                                    <p className="mt-3 text-sm text-red-300">
                                        {otpError}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid gap-5">
                            <Input
                                label="Street Address"
                                value={formData.address}
                                onChange={(value) =>
                                    updateField(
                                        "address",
                                        value
                                    )
                                }
                            />

                            <Input
                                label="Apartment / Unit"
                                value={formData.apartment}
                                onChange={(value) =>
                                    updateField(
                                        "apartment",
                                        value
                                    )
                                }
                            />

                            <div className="grid gap-5 md:grid-cols-3">
                                <Input
                                    label="City"
                                    value={formData.city}
                                    onChange={(value) =>
                                        updateField(
                                            "city",
                                            value
                                        )
                                    }
                                />

                                <Input
                                    label="State"
                                    value={formData.state}
                                    onChange={(value) =>
                                        updateField(
                                            "state",
                                            value
                                        )
                                    }
                                />

                                <Input
                                    label="Zip Code"
                                    value={formData.zipCode}
                                    onChange={(value) =>
                                        updateField(
                                            "zipCode",
                                            value
                                        )
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid gap-5">
                            <Select
                                label="Home Size"
                                value={formData.homeSize}
                                onChange={(value) =>
                                    updateField(
                                        "homeSize",
                                        value
                                    )
                                }
                                options={[
                                    {
                                        label: "1 BR",
                                        value: "1BHK",
                                    },
                                    {
                                        label: "2 BR",
                                        value: "2BHK",
                                    },
                                    {
                                        label: "3 BR",
                                        value: "3BHK",
                                    },
                                    {
                                        label: "4 BR",
                                        value: "4BHK",
                                    },
                                ]}
                            />

                            <Input
                                label="Total Area (sqft)"
                                type="number"
                                value={formData.totalSqft}
                                onChange={(value) =>
                                    updateField(
                                        "totalSqft",
                                        value
                                    )
                                }
                            />

                            <div className="grid gap-5 md:grid-cols-3">
                                <Input
                                    label="Bedrooms"
                                    type="number"
                                    value={formData.bedrooms}
                                    onChange={(value) =>
                                        updateField(
                                            "bedrooms",
                                            value
                                        )
                                    }
                                />

                                <Input
                                    label="Bathrooms"
                                    type="number"
                                    value={formData.bathrooms}
                                    onChange={(value) =>
                                        updateField(
                                            "bathrooms",
                                            value
                                        )
                                    }
                                />

                                <Input
                                    label="Kitchen"
                                    type="number"
                                    value={formData.kitchens}
                                    onChange={(value) =>
                                        updateField(
                                            "kitchens",
                                            value
                                        )
                                    }
                                />
                            </div>

                            {isRecurringService && (
                                <Select
                                    label="Frequency"
                                    value={formData.frequency}
                                    onChange={(value) =>
                                        updateField(
                                            "frequency",
                                            value
                                        )
                                    }
                                    options={[
                                        {
                                            label: "Weekly",
                                            value: "WEEKLY",
                                        },
                                        {
                                            label: "Bi-Weekly",
                                            value: "BI_WEEKLY",
                                        },
                                        {
                                            label: "Monthly",
                                            value: "MONTHLY",
                                        },
                                    ]}
                                />
                            )}

                            {pricing && (
                                <div className="rounded-[24px] border border-[#3a2812] bg-[#0c0a07] p-5">
                                    <div className="flex items-center justify-between gap-5">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.22em] text-[#8f8778]">
                                                Estimated
                                                Authorization
                                            </p>

                                            <p className="mt-2 text-sm text-[#cfc7b7]">
                                                This amount will be
                                                authorized on your card
                                                to reserve the booking.
                                            </p>
                                        </div>

                                        <p className="font-serif text-3xl text-[#d6ab5f]">
                                            ${finalTotal}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="grid gap-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <DatePickerField
                                    label="Preferred Date"
                                    value={
                                        formData.preferredDate
                                    }
                                    onChange={(date) =>
                                        setFormData(
                                            (prev) => ({
                                                ...prev,
                                                preferredDate:
                                                    date,
                                            })
                                        )
                                    }
                                />

                                <Select
                                    label="Preferred Time Slot"
                                    value={
                                        formData.preferredTime
                                    }
                                    onChange={(value) =>
                                        updateField(
                                            "preferredTime",
                                            value
                                        )
                                    }
                                    options={timeSlots}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setFormData(
                                        (prev) => ({
                                            ...prev,
                                            hasPets:
                                                !prev.hasPets,
                                        })
                                    )
                                }
                                className={`rounded-2xl border px-5 py-4 text-left text-sm transition ${
                                    formData.hasPets
                                        ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
                                        : "border-[#2f291d] bg-[#111111] text-[#d8d0c1] hover:border-[#8f6b2f]"
                                }`}
                            >
                                <span className="mr-2">
                                    {formData.hasPets
                                        ? "✓"
                                        : "○"}
                                </span>
                                Do you have pets?
                            </button>

                            <Textarea
                                label="Special Notes"
                                value={formData.specialNotes}
                                onChange={(value) =>
                                    updateField(
                                        "specialNotes",
                                        value
                                    )
                                }
                            />
                        </div>
                    )}

                    {step === 5 && (
                        <div className="grid gap-6">
                            <div className="rounded-[28px] border border-[#2f291d] bg-[#111111] p-6">
                                <h2 className="font-serif text-3xl text-white">
                                    Review Your Booking
                                </h2>

                                <p className="mt-2 text-sm leading-7 text-[#cfc7b7]">
                                    Please review your booking
                                    details before securely
                                    authorizing your card.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <CompactReviewItem
                                    label="Service"
                                    value={
                                        selectedService?.label ||
                                        "Not selected"
                                    }
                                />

                                <CompactReviewItem
                                    label="Add-On Services"
                                    value={
                                        selectedAddOns.length
                                            ? selectedAddOns
                                                  .map(
                                                      (addOn) =>
                                                          `${addOn.label} (+$${addOn.price})`
                                                  )
                                                  .join(", ")
                                            : "None"
                                    }
                                />

                                {isRecurringService && (
                                    <CompactReviewItem
                                        label="Frequency"
                                        value={
                                            formData.frequency ===
                                            "BI_WEEKLY"
                                                ? "Bi-Weekly"
                                                : formData.frequency ===
                                                    "WEEKLY"
                                                  ? "Weekly"
                                                  : "Monthly"
                                        }
                                    />
                                )}

                                <CompactReviewItem
                                    label="Name"
                                    value={formData.fullName}
                                />

                                <CompactReviewItem
                                    label="Email"
                                    value={formData.email}
                                />

                                <CompactReviewItem
                                    label="Phone"
                                    value={normalizePhone()}
                                />

                                <CompactReviewItem
                                    label="Address"
                                    value={`${formData.address}, ${
                                        formData.apartment || ""
                                    }`}
                                />

                                <CompactReviewItem
                                    label="City / State / Zip"
                                    value={`${formData.city}, ${formData.state} ${formData.zipCode}`}
                                />

                                <CompactReviewItem
                                    label="Schedule"
                                    value={`${
                                        formData.preferredDate
                                            ? formData.preferredDate.toDateString()
                                            : "Not selected"
                                    } · ${
                                        formData.preferredTime ||
                                        "No time selected"
                                    }`}
                                />

                                <CompactReviewItem
                                    label="Pets"
                                    value={
                                        formData.hasPets
                                            ? "Yes"
                                            : "No"
                                    }
                                />
                            </div>

                            {pricing && (
                                <div className="overflow-hidden rounded-[28px] border border-[#8f6b2f] bg-[#0c0a07]">
                                    <div className="border-b border-[#3a2812] px-6 py-5">
                                        <h3 className="font-serif text-2xl text-white">
                                            Booking Summary
                                        </h3>

                                        <p className="mt-2 text-sm text-[#cfc7b7]">
                                            Your authorization amount
                                            is calculated based on the
                                            selected service, home size,
                                            total area, and optional
                                            add-ons.
                                        </p>
                                    </div>

                                    <div className="space-y-5 px-6 py-6">
                                        <SummaryRow
                                            label="Service"
                                            value={
                                                pricing.serviceLabel
                                            }
                                        />

                                        <SummaryRow
                                            label="Home Size"
                                            value={
                                                pricing.homeSizeLabel
                                            }
                                        />

                                        <SummaryRow
                                            label="Entered Area"
                                            value={`${pricing.totalSqft} sqft`}
                                        />

                                        <SummaryRow
                                            label="Included Area"
                                            value={`${pricing.includedSqft} sqft`}
                                        />

                                        <SummaryRow
                                            label="Extra Area"
                                            value={`${pricing.extraSqft} sqft`}
                                        />

                                        <SummaryRow
                                            label="Extra Area Charge"
                                            value={`$${pricing.extraSqftCharge}`}
                                        />

                                        {selectedAddOns.map(
                                            (addOn) => (
                                                <SummaryRow
                                                    key={
                                                        addOn.id
                                                    }
                                                    label={
                                                        addOn.label
                                                    }
                                                    value={`+$${addOn.price}`}
                                                />
                                            )
                                        )}

                                        <div className="border-t border-[#3a2812] pt-5">
                                            <div className="flex items-center justify-between gap-5">
                                                <div>
                                                    <p className="text-lg font-medium text-[#f3eadb]">
                                                        Card
                                                        Authorization
                                                        Amount
                                                    </p>

                                                    <p className="mt-1 text-xs leading-6 text-[#8f8778]">
                                                        The final
                                                        payment will
                                                        be captured
                                                        after your
                                                        cleaning is
                                                        completed.
                                                    </p>
                                                </div>

                                                <span className="shrink-0 font-serif text-4xl text-[#d6ab5f]">
                                                    $
                                                    {
                                                        finalTotal
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-[24px] border border-[#8f6b2f]/50 bg-[#151008] p-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#8f6b2f] text-lg text-[#d6ab5f]">
                                        ✓
                                    </div>

                                    <div>
                                        <p className="text-sm font-semibold text-[#e3bd74]">
                                            Secure card
                                            authorization
                                        </p>

                                        <p className="mt-2 text-sm leading-7 text-[#cfc7b7]">
                                            Your card will be
                                            authorized for $
                                            {finalTotal} when you
                                            complete checkout. A
                                            temporary pending hold may
                                            appear on your account, but
                                            the payment will not be
                                            captured until your
                                            cleaning service has been
                                            completed.
                                        </p>

                                        <p className="mt-3 text-xs leading-6 text-[#8f8778]">
                                            If the booking is cancelled
                                            before capture, the
                                            authorization will be
                                            released instead of being
                                            charged.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-[#2f291d] bg-[#111111] p-5">
                                <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                                    Special Notes
                                </p>

                                <p className="mt-3 text-sm leading-7 text-[#f3eadb]">
                                    {formData.specialNotes ||
                                        "No special notes added."}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="rounded-2xl border border-[#5b5141] px-6 py-3 text-sm font-medium text-[#b8ad9a] transition hover:border-[#8f6b2f] hover:text-[#e3bd74]"
                            >
                                Cancel
                            </Link>

                            <button
                                type="button"
                                onClick={prevStep}
                                disabled={step === 0}
                                className="rounded-2xl border border-[#8f6b2f] px-6 py-3 text-sm font-medium text-[#e3bd74] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                        </div>

                        {step < steps.length - 1 ? (
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={
                                    (step === 0 &&
                                        (!formData.cleaningType ||
                                            !formData.acceptedPolicies)) ||
                                    (step === 1 &&
                                        (!formData.acceptedSmsConsent ||
                                            !isPhoneVerified))
                                }
                                className="rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={submitForm}
                                disabled={
                                    isSubmitting || !pricing
                                }
                                className="rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting
                                    ? "Opening Secure Authorization..."
                                    : `Authorize $${finalTotal} & Reserve`}
                            </button>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                {label}
            </span>

            <input
                type={type}
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className={inputClass}
            />
        </label>
    );
}

function Select({
    label,
    value,
    onChange,
    options,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<{
        label: string;
        value: string;
    }>;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                {label}
            </span>

            <select
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className={inputClass}
            >
                <option value="">
                    Select {label}
                </option>

                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                {label}
            </span>

            <textarea
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                rows={5}
                className={`${inputClass} resize-none`}
            />
        </label>
    );
}

function DatePickerField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: Date | null;
    onChange: (date: Date | null) => void;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                {label}
            </span>

            <DatePicker
                selected={value}
                onChange={onChange}
                minDate={new Date()}
                placeholderText="Select preferred date"
                dateFormat="MMMM d, yyyy"
                className={inputClass}
                wrapperClassName="w-full"
            />
        </label>
    );
}

function CompactReviewItem({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
                {label}
            </p>

            <p className="mt-2 text-sm leading-6 text-[#f3eadb]">
                {value || "Not provided"}
            </p>
        </div>
    );
}

function SummaryRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center justify-between gap-5">
            <span className="text-sm uppercase tracking-[0.18em] text-[#8f8778]">
                {label}
            </span>

            <span className="text-base text-[#f1e7d7]">
                {value}
            </span>
        </div>
    );
}

function ServiceDetailsCard({
    service,
}: {
    service: {
        label: string;
        value: string;
        description: string;
        included: string[];
        notIncluded: string[];
        disclaimer: string;
    };
}) {
    return (
        <div className="overflow-hidden rounded-[28px] border border-[#8f6b2f] bg-[#0c0a07]">
            <div className="border-b border-[#3a2812] px-6 py-5">
                <p className="text-xs uppercase tracking-[0.24em] text-[#b7924c]">
                    Service Details
                </p>

                <h3 className="mt-2 font-serif text-3xl text-white">
                    {service.label}
                </h3>

                <p className="mt-3 text-sm leading-7 text-[#cfc7b7]">
                    {service.description}
                </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#d6ab5f]">
                        What’s Included
                    </h4>

                    <div className="grid gap-3">
                        {service.included.map((item) => (
                            <div
                                key={item}
                                className="rounded-2xl border border-[#2f291d] bg-[#111111] p-4 text-sm leading-7 text-[#f3eadb]"
                            >
                                <span className="mr-2 text-[#d6ab5f]">
                                    ✓
                                </span>
                                {item}
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="mb-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#d6ab5f]">
                        Usually Not Included
                    </h4>

                    <div className="grid gap-2">
                        {service.notIncluded.map(
                            (item) => (
                                <div
                                    key={item}
                                    className="rounded-xl border border-[#2f291d] bg-[#111111] px-4 py-3 text-sm text-[#cfc7b7]"
                                >
                                    {item}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            <div className="border-t border-[#3a2812] bg-[#111111] px-6 py-5">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8f8778]">
                    Disclaimer
                </p>

                <p className="mt-2 text-sm leading-7 text-[#cfc7b7]">
                    {service.disclaimer}
                </p>
            </div>

            <div className="border-t border-[#3a2812] px-6 py-5">
                <p className="text-sm font-medium text-[#d6ab5f]">
                    Selected Service: {service.label} ✓
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                        "Fully insured and bonded",
                        "Background-checked professionals",
                        "Professionally registered business",
                        "Premium Manhattan service standards",
                    ].map((point) => (
                        <div
                            key={point}
                            className="rounded-2xl border border-[#2f291d] bg-[#111111] px-4 py-3 text-sm text-[#f3eadb]"
                        >
                            <span className="mr-2 text-[#d6ab5f]">
                                ✓
                            </span>
                            {point}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

const inputClass =
    "w-full rounded-2xl border border-[#2f291d] bg-[#111111] px-4 py-4 text-sm text-white placeholder:text-[#8f8778] outline-none transition focus:border-[#d6ab5f]";
