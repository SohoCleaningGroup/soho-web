-- CreateTable
CREATE TABLE "BookingSlotHold" (
    "id" TEXT NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "preferredTime" TEXT NOT NULL,
    "checkoutSessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingSlotHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingSlotHold_checkoutSessionId_key" ON "BookingSlotHold"("checkoutSessionId");

-- CreateIndex
CREATE INDEX "BookingSlotHold_preferredDate_preferredTime_idx" ON "BookingSlotHold"("preferredDate", "preferredTime");

-- CreateIndex
CREATE INDEX "BookingSlotHold_expiresAt_idx" ON "BookingSlotHold"("expiresAt");
