ALTER TABLE "ProfessionalProfile"
  ADD COLUMN IF NOT EXISTS "hiringTermsTokenHash" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "hiringTermsSignedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "hiringTermsSignedName" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsHash" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsIp" TEXT,
  ADD COLUMN IF NOT EXISTS "hiringTermsUserAgent" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalProfile_hiringTermsTokenHash_key" ON "ProfessionalProfile"("hiringTermsTokenHash");

ALTER TABLE "ProfessionalProfile" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ProfessionalProfile" FROM anon, authenticated;
