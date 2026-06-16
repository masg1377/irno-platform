-- Phase 20: Export & PDF Production Hardening
-- Adds errorMessage column to resume_exports for FAILED status tracking

ALTER TABLE "resume_exports" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
