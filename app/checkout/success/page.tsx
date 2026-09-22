import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <main className="min-h-screen bg-[#060606] px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[85vh] max-w-3xl items-center justify-center">
        <div className="rounded-[32px] border border-[#2a2419] bg-[#0a0a0a] p-10 shadow-[0_24px_80px_rgba(214,171,95,0.12)]">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#d6ab5f] bg-[#151008] text-4xl text-[#d6ab5f]">
              ✓
            </div>

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.34em] text-[#b7924c]">
              Booking Reserved
            </p>

            <h1 className="font-serif text-4xl text-white sm:text-5xl">
              Your Card Has Been Securely Authorized
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-[#cfc7b7]">
              Thank you for choosing SoHo Cleaning Group. Your booking request
              has been successfully received and your card has been securely
              authorized to reserve your appointment.
            </p>
          </div>

          <div className="mt-10 rounded-[24px] border border-[#8f6b2f] bg-[#111111] p-6">
            <h2 className="font-serif text-2xl text-white">
              What happens next?
            </h2>

            <div className="mt-6 space-y-5">
              <div className="flex gap-4">
                <div className="mt-1 text-[#d6ab5f]">✓</div>

                <div>
                  <p className="font-medium text-white">
                    Your booking is reserved
                  </p>

                  <p className="mt-1 text-sm leading-7 text-[#cfc7b7]">
                    Our team will review your booking and prepare it for
                    scheduling.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 text-[#d6ab5f]">✓</div>

                <div>
                  <p className="font-medium text-white">
                    Your card has not been charged
                  </p>

                  <p className="mt-1 text-sm leading-7 text-[#cfc7b7]">
                    You may notice a temporary authorization hold from your bank.
                    This is not a completed payment.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 text-[#d6ab5f]">✓</div>

                <div>
                  <p className="font-medium text-white">
                    Payment is captured after your cleaning
                  </p>

                  <p className="mt-1 text-sm leading-7 text-[#cfc7b7]">
                    Once your cleaning service has been completed, we&apos;ll capture
                    the authorized amount from your card.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="mt-1 text-[#d6ab5f]">✓</div>

                <div>
                  <p className="font-medium text-white">
                    Confirmation and reminders
                  </p>

                  <p className="mt-1 text-sm leading-7 text-[#cfc7b7]">
                    You&apos;ll receive confirmation and appointment updates by SMS
                    as your booking progresses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-[#3a2812] bg-[#151008] p-5">
            <p className="text-sm leading-7 text-[#d8d0c1]">
              <span className="font-semibold text-[#d6ab5f]">
                Important:
              </span>{" "}
              If your booking is cancelled before the service is completed, the
              authorization will simply be released by your bank and no payment
              will be captured.
            </p>
          </div>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="rounded-2xl bg-[#d6ab5f] px-6 py-4 text-sm font-semibold text-black transition hover:scale-[1.02]"
            >
              Back to Home
            </Link>

            <Link
              href="/onboarding/user"
              className="rounded-2xl border border-[#8f6b2f] px-6 py-4 text-sm font-medium text-[#e3bd74] transition hover:bg-[#151008]"
            >
              Book Another Cleaning
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
