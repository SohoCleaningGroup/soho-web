CREATE TABLE IF NOT EXISTS "CleanerPayNotice" (
 "id" TEXT NOT NULL,
 "professionalId" TEXT NOT NULL,
 "employeeName" TEXT NOT NULL,
 "primaryLanguage" TEXT NOT NULL,
 "effectiveDate" TEXT NOT NULL,
 "version" TEXT NOT NULL,
 "snapshot" TEXT NOT NULL,
 "snapshotHash" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "sentAt" TIMESTAMP(3),
 "signedAt" TIMESTAMP(3),
 "signedName" TEXT,
 "signedIp" TEXT,
 "signedUserAgent" TEXT,
 "receiptSentAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CleanerPayNotice_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CleanerPayNotice_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "ProfessionalProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "CleanerPayNotice_primaryLanguage_check" CHECK ("primaryLanguage" IN ('en', 'es'))
);
CREATE UNIQUE INDEX IF NOT EXISTS "CleanerPayNotice_tokenHash_key" ON "CleanerPayNotice"("tokenHash");
CREATE INDEX IF NOT EXISTS "CleanerPayNotice_professionalId_createdAt_idx" ON "CleanerPayNotice"("professionalId", "createdAt");
ALTER TABLE "CleanerPayNotice" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "CleanerPayNotice" FROM anon, authenticated;
