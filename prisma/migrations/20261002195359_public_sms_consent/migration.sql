-- CreateTable
CREATE TABLE "SmsConsentRecord" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "version" TEXT NOT NULL,
    "disclosure" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SmsConsentRecord_phone_createdAt_idx" ON "SmsConsentRecord"("phone", "createdAt");

ALTER TABLE "SmsConsentRecord" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SmsConsentRecord" FROM PUBLIC, anon, authenticated;
