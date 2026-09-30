-- CreateTable
CREATE TABLE "ReferralAccount" (
    "id" TEXT NOT NULL,
    "userProfileId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "rewardCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralUse" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "customerKey" TEXT,
    "rewardSourceId" TEXT,
    "bookingId" TEXT,
    "checkoutSessionId" TEXT,
    "discountCents" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAccount_userProfileId_key" ON "ReferralAccount"("userProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAccount_code_key" ON "ReferralAccount"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralAccount_rewardCode_key" ON "ReferralAccount"("rewardCode");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_customerKey_key" ON "ReferralUse"("customerKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_rewardSourceId_key" ON "ReferralUse"("rewardSourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_bookingId_key" ON "ReferralUse"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralUse_checkoutSessionId_key" ON "ReferralUse"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "ReferralUse_accountId_status_idx" ON "ReferralUse"("accountId", "status");

-- AddForeignKey
ALTER TABLE "ReferralAccount" ADD CONSTRAINT "ReferralAccount_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ReferralAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_rewardSourceId_fkey" FOREIGN KEY ("rewardSourceId") REFERENCES "ReferralUse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralUse" ADD CONSTRAINT "ReferralUse_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Server-only ledgers: browser clients have no access.
ALTER TABLE public."ReferralAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReferralUse" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."ReferralAccount", public."ReferralUse" FROM anon, authenticated;
ALTER TABLE public."ReferralUse" ADD CONSTRAINT "ReferralUse_discount_range" CHECK ("discountCents" BETWEEN 1 AND 3000);
ALTER TABLE public."ReferralUse" ADD CONSTRAINT "ReferralUse_kind" CHECK ("kind" IN ('FRIEND', 'REWARD'));
ALTER TABLE public."ReferralUse" ADD CONSTRAINT "ReferralUse_status" CHECK ("status" IN ('RESERVED', 'BOOKED', 'EARNED', 'REDEEMED', 'RELEASED', 'REVOKED'));
