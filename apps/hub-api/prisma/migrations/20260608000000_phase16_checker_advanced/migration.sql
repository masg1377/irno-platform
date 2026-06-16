-- Phase 16: Resume Checker Advanced
-- Extends resume_check_reports with source metadata, new score fields, and suggestions.
-- Renames ResumeCheckSourceType.TEXT → PASTED_TEXT for clarity (additive enum only;
-- old value preserved for backward compat via new value).

-- Add missing columns to resume_check_reports
ALTER TABLE "resume_check_reports"
  ADD COLUMN IF NOT EXISTS "sourceFileName"         TEXT,
  ADD COLUMN IF NOT EXISTS "sourceTextSnapshot"     TEXT,
  ADD COLUMN IF NOT EXISTS "targetRole"             VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "jobDescriptionSnapshot" TEXT,
  ADD COLUMN IF NOT EXISTS "readabilityScore"       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "roleMatchScore"         INTEGER,
  ADD COLUMN IF NOT EXISTS "suggestions"            JSONB;

-- Add PASTED_TEXT to the enum (TEXT is kept for compat; new code uses PASTED_TEXT)
ALTER TYPE "ResumeCheckSourceType" ADD VALUE IF NOT EXISTS 'PASTED_TEXT';
