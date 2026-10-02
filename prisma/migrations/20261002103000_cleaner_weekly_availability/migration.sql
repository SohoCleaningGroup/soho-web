CREATE TABLE "CleanerWeeklyAvailability" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "windows" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerWeeklyAvailability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CleanerWeeklyAvailability_professionalId_weekStart_key"
ON "CleanerWeeklyAvailability"("professionalId", "weekStart");

CREATE INDEX "CleanerWeeklyAvailability_weekStart_idx"
ON "CleanerWeeklyAvailability"("weekStart");

ALTER TABLE "CleanerWeeklyAvailability"
ADD CONSTRAINT "CleanerWeeklyAvailability_professionalId_fkey"
FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
