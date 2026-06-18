-- Phase 21: Portfolio Case Study Builder
-- Adds structured case study fields to portfolio_projects table
-- All statements are idempotent (IF NOT EXISTS)

ALTER TABLE "portfolio_projects"
  ADD COLUMN IF NOT EXISTS "slug"             VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "clientName"       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "summary"          TEXT,
  ADD COLUMN IF NOT EXISTS "problem"          TEXT,
  ADD COLUMN IF NOT EXISTS "solution"         TEXT,
  ADD COLUMN IF NOT EXISTS "impact"           TEXT,
  ADD COLUMN IF NOT EXISTS "responsibilities" JSONB,
  ADD COLUMN IF NOT EXISTS "mediaUrls"        JSONB,
  ADD COLUMN IF NOT EXISTS "projectType"      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "seoTitle"         VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "seoDescription"   VARCHAR(500);

-- Unique slug per career profile (partial: only when slug and deletedAt are not null)
CREATE UNIQUE INDEX IF NOT EXISTS "portfolio_projects_careerProfileId_slug_key"
  ON "portfolio_projects"("careerProfileId", "slug")
  WHERE "slug" IS NOT NULL AND "deletedAt" IS NULL;

-- Plain slug index (moved here from 20260611234346_phase211 — timestamp ordering fix)
CREATE INDEX IF NOT EXISTS "portfolio_projects_slug_idx"
  ON "portfolio_projects"("slug");
