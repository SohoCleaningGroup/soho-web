"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type IdDocumentType = "NATIONAL_ID" | "PASSPORT" | "";

type FormData = {
    fullName: string;
    email: string;
    phone: string;
    profileImageUrl: string;
    experienceYears: string;
    servicesOffered: string[];
    serviceAreas: string;
    availability: string[];
    hasOwnSupplies: boolean;
    hasTransport: boolean;
    bio: string;

    idDocumentType: IdDocumentType;
    idDocumentFrontUrl: string;
    idDocumentBackUrl: string;
};

const initialData: FormData = {
    fullName: "",
    email: "",
    phone: "",
    profileImageUrl: "",
    experienceYears: "",
    servicesOffered: [],
    serviceAreas: "",
    availability: [],
    hasOwnSupplies: false,
    hasTransport: false,
    bio: "",

    idDocumentType: "",
    idDocumentFrontUrl: "",
    idDocumentBackUrl: "",
};

const steps = ["Personal", "Services", "Availability", "ID Document", "Review"];

const serviceOptions = [
    "SOHO_SIGNATURE",
    "SOHO_SIGNATURE_DEEP",
    "MOVE_IN_MOVE_OUT",
    "RECURRING",
    "AIRBNB_TURNOVER",
];

const availabilityOptions = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
];

export default function ProfessionalOnboardingForm() {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<FormData>(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isUploadingProfileImage, setIsUploadingProfileImage] = useState(false);
    const [profileImagePreviewUrl, setProfileImagePreviewUrl] = useState("");
    const [isUploadingIdFront, setIsUploadingIdFront] = useState(false);
    const [isUploadingIdBack, setIsUploadingIdBack] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpError, setOtpError] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [countryCode, setCountryCode] = useState("+1");

    const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        if (field === "phone") {
            setIsPhoneVerified(false);
            setIsOtpSent(false);
            setOtpCode("");
            setOtpMessage("");
            setOtpError("");
        }
    };

    const toggleArrayValue = (
        field: "servicesOffered" | "availability",
        value: string
    ) => {
        setFormData((prev) => {
            const current = prev[field];

            return {
                ...prev,
                [field]: current.includes(value)
                    ? current.filter((item) => item !== value)
                    : [...current, value],
            };
        });
    };

    const normalizePhone = () => {
        const rawPhone = formData.phone.replace(/\s+/g, "").trim();

        const cleanedPhone = rawPhone.startsWith(countryCode)
            ? rawPhone.slice(countryCode.length)
            : rawPhone.replace(/^\+\d{1,4}/, "");

        return `${countryCode}${cleanedPhone}`;
    };

    const sendOtp = async () => {
        try {
            setIsSendingOtp(true);
            setOtpMessage("");
            setOtpError("");

            const phone = normalizePhone();

            const response = await fetch("/api/sms/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to send OTP");
            }

            setIsOtpSent(true);
            setOtpMessage("Verification code sent successfully.");
        } catch (error) {
            setOtpError(error instanceof Error ? error.message : "Something went wrong");
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    phone: normalizePhone(),
                    code: otpCode,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Invalid verification code");
            }

            setIsPhoneVerified(true);
            setOtpMessage("Phone number verified successfully.");
        } catch (error) {
            setOtpError(error instanceof Error ? error.message : "Something went wrong");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const nextStep = () => {
        if (step === 0 && !isPhoneVerified) {
            alert("Please verify your phone number before continuing.");
            return;
        }

        if (step === 3) {
            if (!formData.idDocumentType) {
                alert("Please select ID document type.");
                return;
            }

            if (!formData.idDocumentFrontUrl || !formData.idDocumentBackUrl) {
                alert("Please upload both required ID document files.");
                return;
            }
        }

        setStep((prev) => Math.min(prev + 1, steps.length - 1));
    };
    const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

    const submitForm = async () => {
        try {
            setIsSubmitting(true);

            const response = await fetch("/api/onboarding/professional", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...formData,
                    phone: normalizePhone(),
                    serviceAreas: formData.serviceAreas
                        .split(",")
                        .map((area) => area.trim())
                        .filter(Boolean),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Something went wrong");
            }

            setIsSuccess(true);
        } catch (error) {
            console.error(error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const uploadProfileImage = async (file: File) => {
        try {
            setIsUploadingProfileImage(true);
            const upload = await uploadProfessionalFile(
                file,
                "profile",
                normalizePhone()
            );
            updateField("profileImageUrl", upload.value);
            setProfileImagePreviewUrl(upload.previewUrl || "");
        } catch (error) {
            console.error(error);
            alert("Image upload failed. Please try again.");
        } finally {
            setIsUploadingProfileImage(false);
        }
    };

    const uploadIdDocument = async (
        file: File,
        side: "front" | "back"
    ) => {
        try {
            const allowedTypes = [
                "application/pdf",
                "image/png",
                "image/jpeg",
                "image/jpg",
            ];

            if (!allowedTypes.includes(file.type)) {
                alert("Only PDF, PNG, JPEG, and JPG files are allowed.");
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert("File size must be less than 2MB.");
                return;
            }

            if (side === "front") {
                setIsUploadingIdFront(true);
            } else {
                setIsUploadingIdBack(true);
            }

            const upload = await uploadProfessionalFile(
                file,
                side === "front" ? "id-front" : "id-back",
                normalizePhone()
            );

            if (side === "front") {
                updateField("idDocumentFrontUrl", upload.value);
            } else {
                updateField("idDocumentBackUrl", upload.value);
            }
        } catch (error) {
            console.error(error);
            alert("Document upload failed. Please try again.");
        } finally {
            setIsUploadingIdFront(false);
            setIsUploadingIdBack(false);
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
                            Application Received
                        </h1>

                        <p className="mt-4 text-[#cfc7b7]">
                            Thank you for applying to join SoHo Cleaning Group. Our team will
                            review your profile and contact you shortly.
                        </p>

                        <Link
                            href="/"
                            className="mt-8 inline-flex rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
                        >
                            Go Home
                        </Link>
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
                        Professional Onboarding
                    </p>

                    <h1 className="font-serif text-4xl text-white sm:text-5xl">
                        Join SoHo Cleaning Group
                    </h1>

                    <p className="mx-auto mt-4 max-w-2xl text-[#d6d0c5]">
                        Tell us about your experience, service areas, and availability.
                    </p>
                </div>

                <div className="mb-8 grid grid-cols-5 gap-3">
                    {steps.map((item, index) => (
                        <div key={item}>
                            <div
                                className={`h-2 rounded-full ${index <= step ? "bg-[#d6ab5f]" : "bg-[#2a2419]"
                                    }`}
                            />
                            <p
                                className={`mt-2 text-center text-xs ${index <= step ? "text-[#d6ab5f]" : "text-[#7e7464]"
                                    }`}
                            >
                                {item}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:p-10">
                    {step === 0 && (
                        <div className="grid gap-5">
                            <ProfileImageUpload
                                value={profileImagePreviewUrl}
                                isUploading={isUploadingProfileImage}
                                onChange={uploadProfileImage}
                            />
                            <Input
                                label="Full Name"
                                value={formData.fullName}
                                onChange={(value) => updateField("fullName", value)}
                            />

                            <Input
                                label="Email Address"
                                type="email"
                                value={formData.email}
                                onChange={(value) => updateField("email", value)}
                            />

                            <div>
                                <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                                    Phone Number
                                </span>

                                <div className="flex overflow-hidden rounded-2xl border border-[#2f291d] bg-[#111111] focus-within:border-[#d6ab5f]">
                                    <select
                                        value={countryCode}
                                        onChange={(event) => {
                                            setCountryCode(event.target.value);
                                            setIsPhoneVerified(false);
                                            setIsOtpSent(false);
                                            setOtpCode("");
                                            setOtpMessage("");
                                            setOtpError("");
                                        }}
                                        className="border-r border-[#2f291d] bg-[#111111] px-4 text-sm text-white outline-none"
                                    >
                                        <option value="+1">🇺🇸 +1</option>
                                        <option value="+91">🇮🇳 +91</option>
                                        <option value="+44">🇬🇧 +44</option>
                                        <option value="+971">🇦🇪 +971</option>
                                    </select>

                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(event) => updateField("phone", event.target.value)}
                                        placeholder="6465300590"
                                        className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-[#8f8778]"
                                    />

                                    <button
                                        type="button"
                                        onClick={sendOtp}
                                        disabled={isSendingOtp || !formData.phone || isPhoneVerified}
                                        className="min-w-[120px] border-l border-[#2f291d] px-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008] disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {isSendingOtp ? "Sending..." : isPhoneVerified ? "Verified" : "Send OTP"}
                                    </button>
                                </div>

                                {isOtpSent && !isPhoneVerified && (
                                    <div className="mt-4 flex overflow-hidden rounded-2xl border border-[#2f291d] bg-[#111111] focus-within:border-[#d6ab5f]">
                                        <input
                                            type="text"
                                            value={otpCode}
                                            onChange={(event) => setOtpCode(event.target.value)}
                                            placeholder="Enter OTP"
                                            className="w-full bg-transparent px-4 py-4 text-sm text-white outline-none placeholder:text-[#8f8778]"
                                        />

                                        <button
                                            type="button"
                                            onClick={verifyOtp}
                                            disabled={isVerifyingOtp || !otpCode}
                                            className="min-w-[120px] bg-[#d6ab5f] px-4 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isVerifyingOtp ? "Verifying..." : "Verify"}
                                        </button>
                                    </div>
                                )}

                                {otpMessage && <p className="mt-3 text-sm text-green-300">{otpMessage}</p>}
                                {otpError && <p className="mt-3 text-sm text-red-300">{otpError}</p>}
                            </div>

                            <Input
                                label="Years of Experience"
                                type="number"
                                value={formData.experienceYears}
                                onChange={(value) => updateField("experienceYears", value)}
                            />
                        </div>
                    )}

                    {step === 1 && (
                        <div className="grid gap-6">
                            <div>
                                <p className="mb-3 text-sm font-medium text-[#d8d0c1]">
                                    Which services can you provide?
                                </p>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {serviceOptions.map((service) => (
                                        <CheckboxCard
                                            key={service}
                                            label={formatLabel(service)}
                                            checked={formData.servicesOffered.includes(service)}
                                            onClick={() => toggleArrayValue("servicesOffered", service)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                label="Service Areas / Zip Codes"
                                placeholder="Example: SoHo, Tribeca, Chelsea, 10012, 10013"
                                value={formData.serviceAreas}
                                onChange={(value) => updateField("serviceAreas", value)}
                            />

                            <div className="grid gap-4 md:grid-cols-2">
                                <SwitchCard
                                    label="I have my own cleaning supplies"
                                    checked={formData.hasOwnSupplies}
                                    onClick={() =>
                                        updateField("hasOwnSupplies", !formData.hasOwnSupplies)
                                    }
                                />

                                <SwitchCard
                                    label="I have reliable transportation"
                                    checked={formData.hasTransport}
                                    onClick={() => updateField("hasTransport", !formData.hasTransport)}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="grid gap-6">
                            <div>
                                <p className="mb-3 text-sm font-medium text-[#d8d0c1]">
                                    Select your available days
                                </p>

                                <div className="grid gap-3 md:grid-cols-2">
                                    {availabilityOptions.map((day) => (
                                        <CheckboxCard
                                            key={day}
                                            label={formatLabel(day)}
                                            checked={formData.availability.includes(day)}
                                            onClick={() => toggleArrayValue("availability", day)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <Textarea
                                label="Short Bio / Work Background"
                                placeholder="Tell us briefly about your cleaning experience, work style, and customer service approach."
                                value={formData.bio}
                                onChange={(value) => updateField("bio", value)}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="grid gap-6">
                            <div>
                                <p className="mb-3 text-sm font-medium text-[#d8d0c1]">
                                    Select ID Document Type
                                </p>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <CheckboxCard
                                        label="National ID"
                                        checked={formData.idDocumentType === "NATIONAL_ID"}
                                        onClick={() => {
                                            updateField("idDocumentType", "NATIONAL_ID");
                                            updateField("idDocumentFrontUrl", "");
                                            updateField("idDocumentBackUrl", "");
                                        }}
                                    />

                                    <CheckboxCard
                                        label="Passport"
                                        checked={formData.idDocumentType === "PASSPORT"}
                                        onClick={() => {
                                            updateField("idDocumentType", "PASSPORT");
                                            updateField("idDocumentFrontUrl", "");
                                            updateField("idDocumentBackUrl", "");
                                        }}
                                    />
                                </div>
                            </div>

                            {formData.idDocumentType && (
                                <div className="grid gap-5 md:grid-cols-2">
                                    <IdDocumentUpload
                                        label={
                                            formData.idDocumentType === "PASSPORT"
                                                ? "Passport First Page"
                                                : "National ID Front Side"
                                        }
                                        value={formData.idDocumentFrontUrl}
                                        isUploading={isUploadingIdFront}
                                        onChange={(file) => uploadIdDocument(file, "front")}
                                    />

                                    <IdDocumentUpload
                                        label={
                                            formData.idDocumentType === "PASSPORT"
                                                ? "Passport Last Page"
                                                : "National ID Back Side"
                                        }
                                        value={formData.idDocumentBackUrl}
                                        isUploading={isUploadingIdBack}
                                        onChange={(file) => uploadIdDocument(file, "back")}
                                    />
                                </div>
                            )}

                            <div className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
                                <p className="text-sm leading-7 text-[#cfc7b7]">
                                    Accepted files: PDF, PNG, JPG, JPEG. Maximum file size: 2MB per file.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="grid gap-6">
                            <div className="rounded-[28px] border border-[#2f291d] bg-[#111111] p-6">
                                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#8f6b2f] bg-[#151008] font-serif text-3xl text-[#d6ab5f]">
                                        {profileImagePreviewUrl ? (
                                            <Image
                                                src={profileImagePreviewUrl}
                                                alt={formData.fullName}
                                                fill
                                                sizes="80px"
                                                className="object-cover"
                                            />
                                        ) : formData.fullName ? (
                                            formData.fullName
                                                .split(" ")
                                                .map((name) => name[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()
                                        ) : (
                                            "SC"
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <h2 className="font-serif text-3xl text-white">
                                            {formData.fullName || "Cleaning Professional"}
                                        </h2>
                                        <p className="mt-1 text-sm text-[#cfc7b7]">{formData.email}</p>
                                        <p className="mt-1 text-sm text-[#cfc7b7]">{normalizePhone()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <CompactReviewItem
                                    label="Experience"
                                    value={`${formData.experienceYears || "0"} years`}
                                />
                                <CompactReviewItem
                                    label="Service Areas"
                                    value={formData.serviceAreas || "Not provided"}
                                />
                                <CompactReviewItem
                                    label="Services"
                                    value={
                                        formData.servicesOffered.length
                                            ? formData.servicesOffered.map(formatLabel).join(", ")
                                            : "Not selected"
                                    }
                                />
                                <CompactReviewItem
                                    label="Availability"
                                    value={
                                        formData.availability.length
                                            ? formData.availability.map(formatLabel).join(", ")
                                            : "Not selected"
                                    }
                                />
                                <CompactReviewItem
                                    label="Own Supplies"
                                    value={formData.hasOwnSupplies ? "Yes" : "No"}
                                />
                                <CompactReviewItem
                                    label="Transportation"
                                    value={formData.hasTransport ? "Yes" : "No"}
                                />
                                <CompactReviewItem
                                    label="ID Document Type"
                                    value={
                                        formData.idDocumentType
                                            ? formatLabel(formData.idDocumentType)
                                            : "Not selected"
                                    }
                                />
                                <CompactReviewItem
                                    label="ID Documents"
                                    value={
                                        formData.idDocumentFrontUrl && formData.idDocumentBackUrl
                                            ? "Uploaded"
                                            : "Missing"
                                    }
                                />
                            </div>

                            <div className="rounded-[24px] border border-[#2f291d] bg-[#111111] p-5">
                                <p className="text-xs uppercase tracking-[0.2em] text-[#8f8778]">
                                    Bio / Work Background
                                </p>
                                <p className="mt-3 text-sm leading-7 text-[#f3eadb]">
                                    {formData.bio || "Not provided"}
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
                                disabled={step === 0 && !isPhoneVerified}
                                className="rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={submitForm}
                                disabled={isSubmitting}
                                className="rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "Submitting..." : "Submit Application"}
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
                onChange={(event) => onChange(event.target.value)}
                className={inputClass}
            />
        </label>
    );
}

function Textarea({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-[#d8d0c1]">
                {label}
            </span>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                rows={5}
                placeholder={placeholder}
                className={`${inputClass} resize-none`}
            />
        </label>
    );
}

function CheckboxCard({
    label,
    checked,
    onClick,
}: {
    label: string;
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-2xl border px-5 py-4 text-left text-sm transition ${checked
                ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
                : "border-[#2f291d] bg-[#111111] text-[#d8d0c1] hover:border-[#8f6b2f]"
                }`}
        >
            <span className="mr-2">{checked ? "✓" : "○"}</span>
            {label}
        </button>
    );
}

function SwitchCard({
    label,
    checked,
    onClick,
}: {
    label: string;
    checked: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm transition ${checked
                ? "border-[#d6ab5f] bg-[#151008] text-[#d6ab5f]"
                : "border-[#2f291d] bg-[#111111] text-[#d8d0c1] hover:border-[#8f6b2f]"
                }`}
        >
            <span>{label}</span>
            <span>{checked ? "Yes" : "No"}</span>
        </button>
    );
}

function CompactReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[22px] border border-[#2f291d] bg-[#111111] p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#8f8778]">
                {label}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#f3eadb]">{value}</p>
        </div>
    );
}

function formatLabel(value: string) {
    return value
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function ProfileImageUpload({
    value,
    isUploading,
    onChange,
}: {
    value: string;
    isUploading: boolean;
    onChange: (file: File) => void;
}) {
    return (
        <div className="flex flex-col items-center rounded-[28px] border border-[#2f291d] bg-[#111111] p-6 text-center">
            <div className="relative mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-[#8f6b2f] bg-[#151008] text-3xl text-[#d6ab5f]">
                {value ? (
                    <Image
                        src={value}
                        alt="Professional profile"
                        fill
                        sizes="112px"
                        className={`object-cover ${isUploading ? "opacity-40" : ""}`}
                    />
                ) : (
                    <span className={isUploading ? "opacity-20" : ""}>SC</span>
                )}

                {isUploading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#d6ab5f] border-t-transparent" />
                        <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#d6ab5f]">
                            Uploading
                        </span>
                    </div>
                )}
            </div>

            <label
                className={`rounded-2xl px-5 py-3 text-sm font-semibold transition ${isUploading
                    ? "cursor-not-allowed bg-[#2a2419] text-[#7e7464]"
                    : "cursor-pointer bg-[#d6ab5f] text-black hover:scale-[1.02]"
                    }`}
            >
                {isUploading ? "Uploading..." : value ? "Change Profile Picture" : "Upload Profile Picture"}

                <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onChange(file);
                        event.target.value = "";
                    }}
                />
            </label>

            <p className="mt-3 text-xs text-[#8f8778]">
                Upload a clear photo. JPG or PNG recommended.
            </p>
        </div>
    );
}

function IdDocumentUpload({
    label,
    value,
    isUploading,
    onChange,
}: {
    label: string;
    value: string;
    isUploading: boolean;
    onChange: (file: File) => void;
}) {
    return (
        <div className="rounded-[28px] border border-[#2f291d] bg-[#111111] p-5">
            <p className="mb-3 text-sm font-medium text-[#d8d0c1]">{label}</p>

            <div className="mb-4 flex min-h-[180px] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#3a2812] bg-[#0a0a0a]">
                {value ? (
                    <div className="text-center">
                        <p className="text-4xl text-[#d6ab5f]">✓</p>
                        <p className="mt-3 text-sm text-[#e3bd74]">Securely uploaded</p>
                    </div>
                ) : (
                    <p className="px-6 text-center text-sm leading-7 text-[#8f8778]">
                        No file uploaded yet.
                    </p>
                )}
            </div>

            <label
                className={`inline-flex w-full justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition ${isUploading
                    ? "cursor-not-allowed bg-[#2a2419] text-[#7e7464]"
                    : "cursor-pointer bg-[#d6ab5f] text-black hover:scale-[1.02]"
                    }`}
            >
                {isUploading ? "Uploading..." : value ? "Replace File" : "Upload File"}

                <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                    disabled={isUploading}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) onChange(file);
                        event.target.value = "";
                    }}
                />
            </label>
        </div>
    );
}

async function uploadProfessionalFile(
    file: File,
    kind: "profile" | "id-front" | "id-back",
    phone: string
) {
    const formData = new FormData();
    formData.set("file", file);
    formData.set("kind", kind);
    formData.set("flow", "application");
    formData.set("phone", phone);

    const response = await fetch("/api/uploads/professional", {
        method: "POST",
        body: formData,
    });
    const result = await response.json();

    if (!response.ok || !result.success || typeof result.value !== "string") {
        throw new Error(result.message || "Upload failed.");
    }

    return {
        value: result.value as string,
        previewUrl:
            typeof result.previewUrl === "string" ? result.previewUrl : undefined,
    };
}

const inputClass =
    "w-full rounded-2xl border border-[#2f291d] bg-[#111111] px-4 py-4 text-sm text-white placeholder:text-[#8f8778] outline-none transition focus:border-[#d6ab5f]";
