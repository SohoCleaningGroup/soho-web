-- AlterTable
ALTER TABLE "JobAssignment" ADD COLUMN     "siteLatitude" DOUBLE PRECISION,
ADD COLUMN     "siteLongitude" DOUBLE PRECISION,
ADD COLUMN     "siteRadiusMeters" INTEGER NOT NULL DEFAULT 150;

-- CreateTable
CREATE TABLE "CleanerTimecard" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "approvedAt" TIMESTAMP(3),
    "approvalNote" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanerTimecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanerClockEvent" (
    "id" TEXT NOT NULL,
    "timecardId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleanerClockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CleanerTimecard_professionalId_startedAt_idx" ON "CleanerTimecard"("professionalId", "startedAt");

-- CreateIndex
CREATE INDEX "CleanerTimecard_assignmentId_startedAt_idx" ON "CleanerTimecard"("assignmentId", "startedAt");

-- CreateIndex
CREATE INDEX "CleanerTimecard_status_startedAt_idx" ON "CleanerTimecard"("status", "startedAt");

-- CreateIndex
CREATE INDEX "CleanerClockEvent_timecardId_createdAt_idx" ON "CleanerClockEvent"("timecardId", "createdAt");

-- AddForeignKey
ALTER TABLE "CleanerTimecard" ADD CONSTRAINT "CleanerTimecard_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "JobAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerTimecard" ADD CONSTRAINT "CleanerTimecard_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanerClockEvent" ADD CONSTRAINT "CleanerClockEvent_timecardId_fkey" FOREIGN KEY ("timecardId") REFERENCES "CleanerTimecard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Keep attendance and location records accessible only through authenticated server routes.
ALTER TABLE "CleanerTimecard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CleanerClockEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CleanerTimecard", "CleanerClockEvent" FROM anon, authenticated;
CREATE UNIQUE INDEX "CleanerTimecard_one_open_per_cleaner" ON "CleanerTimecard" ("professionalId") WHERE "endedAt" IS NULL;
ALTER TABLE "CleanerTimecard" ADD CONSTRAINT "CleanerTimecard_period_check" CHECK ("endedAt" IS NULL OR "endedAt" > "startedAt");
ALTER TABLE "CleanerTimecard" ADD CONSTRAINT "CleanerTimecard_status_check" CHECK (("endedAt" IS NULL AND "status" = 'OPEN') OR ("endedAt" IS NOT NULL AND "status" IN ('PENDING', 'APPROVED')));
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_site_check" CHECK (("siteLatitude" IS NULL AND "siteLongitude" IS NULL) OR ("siteLatitude" BETWEEN -90 AND 90 AND "siteLongitude" BETWEEN -180 AND 180));
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_radius_check" CHECK ("siteRadiusMeters" BETWEEN 25 AND 1000);
