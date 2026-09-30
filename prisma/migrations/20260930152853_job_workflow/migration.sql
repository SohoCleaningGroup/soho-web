-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "reviewTokenHash" TEXT,
    "reviewExpiresAt" TIMESTAMP(3),
    "reviewStatus" TEXT NOT NULL DEFAULT 'NONE',
    "reviewNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPhoto" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_bookingId_key" ON "JobAssignment"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_tokenHash_key" ON "JobAssignment"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_reviewTokenHash_key" ON "JobAssignment"("reviewTokenHash");

-- CreateIndex
CREATE INDEX "JobAssignment_professionalId_idx" ON "JobAssignment"("professionalId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPhoto_path_key" ON "JobPhoto"("path");

-- CreateIndex
CREATE INDEX "JobPhoto_assignmentId_idx" ON "JobPhoto"("assignmentId");

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPhoto" ADD CONSTRAINT "JobPhoto_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "JobAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "JobAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobPhoto" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "JobAssignment", "JobPhoto" FROM anon, authenticated;
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_status_check" CHECK (status IN ('PENDING','ACCEPTED','DECLINED'));
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_reviewStatus_check" CHECK ("reviewStatus" IN ('NONE','AWAITING','APPROVED','ATTENTION'));
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('job-completion-photos', 'job-completion-photos', false, 3145728, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
