-- Phase 18.3: Job Match External Resume Support
-- Adds source tracking columns to job_match_reports
-- All statements are idempotent (IF NOT EXISTS) per project migration rules

ALTER TABLE "job_match_reports"
  ADD COLUMN IF NOT EXISTS "sourceType"         VARCHAR(50)  NOT NULL DEFAULT 'IRNO_RESUME',
  ADD COLUMN IF NOT EXISTS "sourceFileName"      VARCHAR(500),
  ADD COLUMN IF NOT EXISTS "sourceTextSnapshot"  TEXT,
  ADD COLUMN IF NOT EXISTS "targetRole"          VARCHAR(200);

CREATE INDEX IF NOT EXISTS "job_match_reports_sourceType_idx" ON "job_match_reports"("sourceType");
