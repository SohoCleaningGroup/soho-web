import Link from "next/link";
import type { Metadata } from "next";
import SmsConsentForm from "./SmsConsentForm";
export const metadata: Metadata = {
  title: "SMS Booking Updates",
  description: "Choose whether to receive SoHo Cleaning Group booking updates by text.",
  alternates: { canonical: "/sms-consent" },
};
export default function SmsConsentPage() {
  return <main className="min-h-screen bg-[#060606] px-4 py-14 text-white"><section className="mx-auto max-w-xl">
    <Link href="/" className="text-sm text-[#d6ab5f]">SoHo Cleaning Group</Link>
    <h1 className="mt-6 font-serif text-4xl">SMS booking updates</h1>
    <p className="mt-4 leading-7 text-[#d6d0c5]">Choose whether you would like text updates about your cleaning service. You can save your choice here without signing in, receiving a code, booking, or paying.</p>
    <SmsConsentForm />
  </section></main>;
}
