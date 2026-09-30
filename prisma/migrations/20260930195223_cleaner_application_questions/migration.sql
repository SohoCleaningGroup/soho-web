-- Add optional screening data; existing applications remain readable.
ALTER TABLE public."ProfessionalProfile" ADD COLUMN IF NOT EXISTS "screeningResponses" JSONB;
