import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "Terms and conditions for SoHo Cleaning Group services.",
  alternates: { canonical: "/terms-and-conditions" },
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-[#060606] px-4 py-16 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-4xl">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
          Terms & Conditions
        </p>

        <h1 className="font-serif text-4xl text-white sm:text-6xl">
          Terms and Conditions
        </h1>

        <div className="mt-10 space-y-8 rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-6 text-sm leading-8 text-[#d6d0c5] sm:p-10">
          <Section title="1. Services">
            SoHo Cleaning Group provides residential cleaning services in
            Manhattan. Service scope may vary based on the cleaning type,
            property condition, selected add-ons, and booking details.
          </Section>

          <Section title="2. Bookings">
            Customers are responsible for providing accurate booking details,
            including address, home size, access instructions, preferred date,
            time slot, and any special notes.
          </Section>

          <Section title="3. Payments">
            Payments are processed securely through Stripe. When a booking is
            submitted, your card may be authorized for the estimated booking amount
            without being immediately charged. The authorization may appear as a
            temporary pending hold on your account. Payment is generally captured
            after the cleaning service is completed. If the final service amount
            changes, we may request an additional authorization before capturing
            payment. Pricing may vary based on service type, home size, square
            footage, selected add-ons, property condition, and requested services.
          </Section>

          <Section title="4. Access to Property">
            Customers must ensure safe and timely access to the property. If our
            cleaning team is unable to access the property within 20 minutes of
            arrival due to missing keys, no response, building restrictions,
            doorman issues, elevator delays, or other access-related issues, a
            lockout fee or cancellation fee may apply. If our team is already en
            route or onsite and access cannot be provided, the full booking
            amount is non-refundable.
          </Section>

          <Section title="5. Service Limitations">
            We provide residential cleaning services only. We do not perform
            remediation, restoration, biohazard cleanup, pest-related cleanup,
            exterior window cleaning, heavy lifting, unsafe ladder work,
            appliance repair, plumbing, electrical work, or hazardous-material
            handling.
          </Section>

          <Section title="6. Heavy Soil or Extreme Conditions">
            Pricing assumes normal residential conditions. Excessive buildup,
            clutter, heavy soil, post-construction debris, or unsafe conditions
            may require additional charges or service refusal.
          </Section>

          <Section title="7. Pets">
            Customers must disclose whether pets are present in the home. Pets
            should be safely secured during the cleaning visit for the safety of
            both the cleaning professional and the pet.
          </Section>

          <Section title="8. Cleaning Products & Equipment">
            SoHo Cleaning Group arrives fully equipped with professional-grade
            cleaning supplies and equipment needed to complete your service. If
            you prefer that we use your cleaning products, specialty tools, or
            surface-specific products, please let us know before your scheduled
            appointment. We will do our best to accommodate your request when
            possible.
          </Section>

          <Section title="9. Client-Provided Products or Equipment">
            When client-provided products or equipment are used, SoHo Cleaning
            Group is not responsible for product performance, equipment
            malfunction, surface reactions, or cleaning results affected by
            those items.
          </Section>

          <Section title="10. Cancellations and Rescheduling">
            Cancellation and rescheduling requests should be made as early as
            possible. Cancellations made 48 or more hours before the scheduled
            service may be cancelled with no fee. Cancellations made 24 to 48
            hours before service may be subject to a 25% fee. Cancellations made
            less than 24 hours before service may be subject to a 50% fee.
            Same-day cancellations, no-shows, or lockouts may be charged the
            full booking amount.
          </Section>

          <Section title="11. Satisfaction Guarantee / Re-Clean Policy">
            Any service concerns must be reported within 24 hours of service
            completion. SoHo Cleaning Group may offer a re-clean at its
            discretion. Refunds are not guaranteed.
          </Section>

          <Section title="12. Damage Claims">
            Damage claims must be reported within 24 hours of service completion
            with supporting photos. Claims submitted after this period may not
            be eligible for review.
          </Section>

          <Section title="13. Photo Documentation">
            SoHo Cleaning Group may document property conditions with
            before-and-after photos for quality assurance, training, and dispute
            resolution.
          </Section>

          <Section title="14. Liability">
            SoHo Cleaning Group takes reasonable care while performing services.
            Customers must report any concerns promptly. We are not responsible
            for pre-existing damage, fragile items not disclosed in advance,
            unsafe working conditions, or issues caused by client-provided
            products or equipment.
          </Section>

          <Section title="15. Professional Conduct">
            Our cleaning professionals are expected to follow company standards,
            respect customer privacy, and perform services with care,
            discretion, and professionalism.
          </Section>

          <Section title="16. SMS Communications">
            By providing your mobile phone number and consenting to receive text
            messages from SoHo Cleaning Group, you agree to receive transactional
            and service-related SMS messages regarding services you request. These
            may include verification messages, booking confirmations, booking
            status updates, cleaning professional assignment notifications, payment
            authorization and payment status updates, cancellation notices, and
            other service-related communications. Message frequency varies based on
            your booking or account activity. Message and data rates may apply. Reply
            STOP to opt out at any time or HELP for assistance. Consent to receive
            SMS messages is not a condition of purchase. For information about how
            we handle your information, please review our Privacy Policy.
          </Section>

          <Section title="17. Changes to Terms">
            SoHo Cleaning Group may update these Terms and Conditions from time
            to time. Continued use of our services means you accept the updated
            terms.
          </Section>

          <div className="border-t border-[#2a2419] pt-8">
            <p className="text-xs text-[#8f8778]">Last updated: 2026</p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-2xl bg-[#d6ab5f] px-6 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl text-white">{title}</h2>
      <p>{children}</p>
    </section>
  );
}
