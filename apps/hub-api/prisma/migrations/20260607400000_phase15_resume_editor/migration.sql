-- Phase 15: Irno CV Deep Resume Editor
-- Adds defaultSections to ResumeTemplate and watermark/style fields to ResumeDocument

-- ResumeTemplate: add defaultSections JSON array
ALTER TABLE "resume_templates"
  ADD COLUMN IF NOT EXISTS "defaultSections" JSONB;

-- ResumeDocument: add watermark fields + style enhancements
ALTER TABLE "resume_documents"
  ADD COLUMN IF NOT EXISTS "includeWatermark" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "watermarkConfig" JSONB;
