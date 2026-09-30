ALTER TABLE "Booking"
  ADD COLUMN "acceptedSmsConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "smsConsentAt" TIMESTAMP(3),
  ADD COLUMN "smsConsentPhone" TEXT,
  ADD COLUMN "smsConsentVersion" TEXT;
