import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How SoHo Cleaning Group collects, uses and protects information.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#060606] px-4 py-16 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Privacy Policy
        </p>

        <h1 className="font-serif text-4xl text-white sm:text-6xl">
          Privacy Policy
        </h1>

        <div className="mt-10 space-y-8 rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 text-sm leading-8 text-[#d6d0c5] sm:p-10">
          <Section title="1. Information We Collect">
            We may collect your name, email address, phone number, service address, booking details, payment status, and information submitted through customer or professional onboarding forms.
          </Section>

          <Section title="2. How We Use Information">
            We use your information to process bookings, verify phone numbers, send service updates, manage payments, review professional applications, and provide customer support.
          </Section>

          <Section title="3. Payments">
            Payments are processed through Stripe. SoHo Cleaning Group does not store full credit card numbers or sensitive card details on our servers.
          </Section>

          <Section title="4. SMS Communications">
            When you provide your mobile phone number and explicitly opt in to SMS
            communications, SoHo Cleaning Group may send you transactional and
            service-related text messages. These messages may include phone
            verification, booking confirmations, booking status updates, cleaning
            professional assignment notifications, payment authorization and payment
            status updates, cancellation notices, and other communications related to
            services you have requested. Message frequency varies based on your booking
            activity. Message and data rates may apply. Reply STOP to opt out of SMS
            messages at any time or HELP for help. Consent to receive SMS messages is
            not a condition of purchase.
          </Section>

          <Section title="5. Professional Documents">
            Professional applicants may upload identification documents for verification. These documents are used only for review and onboarding purposes.
          </Section>

          <Section title="6. Data Sharing">
            We do not sell or rent your personal information. We may disclose personal
            information to service providers solely as necessary to operate our
            business and provide services you request, such as payment processing,
            communications, hosting, and other operational services. Mobile phone
            numbers, SMS opt-in data, and messaging consent will not be shared, sold,
            rented, or provided to third parties or affiliates for marketing or
            promotional purposes. SMS opt-in data and consent are used only for the
            messaging program for which you provided consent and will not be
            transferred to another business for its own marketing or promotional use.
          </Section>

          <Section title="7. Data Security">
            We take reasonable steps to protect submitted information. However, no online system can be guaranteed to be completely secure.
          </Section>

          <Section title="8. Contact">
            For privacy-related questions, please contact SoHo Cleaning Group using the contact details provided on our website.
          </Section>

          <div className="border-t border-[#2a2419] pt-8">
            <p className="text-xs text-[#8f8778]">Last updated: 2026</p>

            <Link href="/" className="mt-6 inline-flex rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl text-white">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
