ALTER TABLE "Booking"
ADD COLUMN "totalSqft" INTEGER,
ADD COLUMN "estimatedDurationMinutes" INTEGER;

ALTER TABLE "BookingSlotHold"
ADD COLUMN "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 120;

ALTER TABLE "BookingSlotHold"
ALTER COLUMN "estimatedDurationMinutes" DROP DEFAULT;
