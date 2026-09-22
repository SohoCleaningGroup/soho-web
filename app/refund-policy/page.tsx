import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund and cancellation policy for SoHo Cleaning Group services.",
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#060606] px-4 py-16 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Refund Policy
        </p>

        <h1 className="font-serif text-4xl text-white sm:text-6xl">
          Refund Policy
        </h1>

        <div className="mt-10 space-y-8 rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 text-sm leading-8 text-[#d6d0c5] sm:p-10">
          <Section title="1. Payment and Booking Confirmation">
            Payments are processed securely through Stripe. Once payment is completed, your booking request is submitted to SoHo Cleaning Group for scheduling and review.
          </Section>

          <Section title="2. Cancellations">
            Customers should request cancellations as early as possible. Cancellation eligibility may depend on how close the request is to the scheduled service time.
          </Section>

          <Section title="3. Refund Eligibility">
            Refunds may be considered if a service cannot be fulfilled by SoHo Cleaning Group, if a duplicate payment occurs, or if cancellation is approved before service preparation has begun.
          </Section>

          <Section title="4. Non-Refundable Situations">
            Refunds may not be available for missed appointments, inability to access the property, inaccurate booking details, same-day cancellations, or services already completed.
          </Section>

          <Section title="5. Processing Time">
            Approved refunds will be processed back to the original payment method. Processing times may vary depending on Stripe and the customer’s bank or card provider.
          </Section>

          <Section title="6. Contact">
            For refund or cancellation requests, please contact SoHo Cleaning Group using the contact details provided on our website.
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
