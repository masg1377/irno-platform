-- Phase 12.1: Taxonomy / Master Data
-- All statements are idempotent per project migration rules.

-- ── New enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "TaxonomyTermType" AS ENUM (
    'COURSE_CATEGORY', 'SKILL_CATEGORY', 'CREDIT_CATEGORY',
    'EVENT_CATEGORY', 'RESUME_CATEGORY', 'GENERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TaxonomyTermStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── TaxonomyTerm table ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "taxonomy_terms" (
  "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
  "type"        "TaxonomyTermType" NOT NULL,
  "title"       VARCHAR(255)  NOT NULL,
  "slug"        VARCHAR(255)  NOT NULL,
  "description" TEXT,
  "parentId"    UUID,
  "status"      "TaxonomyTermStatus" NOT NULL DEFAULT 'ACTIVE',
  "sortOrder"   INTEGER       NOT NULL DEFAULT 0,
  "color"       VARCHAR(50),
  "icon"        VARCHAR(100),
  "metadata"    JSONB,
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "deletedAt"   TIMESTAMPTZ,
  CONSTRAINT "taxonomy_terms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "taxonomy_terms_type_slug_unique" UNIQUE ("type", "slug"),
  CONSTRAINT "taxonomy_terms_parentId_fkey" FOREIGN KEY ("parentId")
    REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "taxonomy_terms_type_idx"      ON "taxonomy_terms"("type");
CREATE INDEX IF NOT EXISTS "taxonomy_terms_status_idx"    ON "taxonomy_terms"("status");
CREATE INDEX IF NOT EXISTS "taxonomy_terms_parentId_idx"  ON "taxonomy_terms"("parentId");
CREATE INDEX IF NOT EXISTS "taxonomy_terms_deletedAt_idx" ON "taxonomy_terms"("deletedAt");
CREATE INDEX IF NOT EXISTS "taxonomy_terms_sortOrder_idx" ON "taxonomy_terms"("type", "sortOrder");

-- ── Add categoryId FK to courses ───────────────────────────────────────────────

ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "categoryId" UUID,
  ADD COLUMN IF NOT EXISTS "legacyCategory" VARCHAR(100);

-- Migrate existing category text → legacyCategory (preserve old data)
UPDATE "courses" SET "legacyCategory" = "category"
  WHERE "legacyCategory" IS NULL AND "category" IS NOT NULL AND "category" != '';

-- Add FK constraint idempotently
DO $$ BEGIN
  ALTER TABLE "courses"
    ADD CONSTRAINT "courses_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "courses_categoryId_idx"     ON "courses"("categoryId");
CREATE INDEX IF NOT EXISTS "courses_legacyCategory_idx" ON "courses"("legacyCategory");

-- ── Add categoryId FK to skills ────────────────────────────────────────────────

ALTER TABLE "skills"
  ADD COLUMN IF NOT EXISTS "categoryId" UUID,
  ADD COLUMN IF NOT EXISTS "legacyCategory" VARCHAR(100);

UPDATE "skills" SET "legacyCategory" = "category"
  WHERE "legacyCategory" IS NULL AND "category" IS NOT NULL AND "category" != '';

DO $$ BEGIN
  ALTER TABLE "skills"
    ADD CONSTRAINT "skills_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "skills_categoryId_idx"     ON "skills"("categoryId");
CREATE INDEX IF NOT EXISTS "skills_legacyCategory_idx" ON "skills"("legacyCategory");

-- ── Add categoryId FK to credits ───────────────────────────────────────────────

ALTER TABLE "credits"
  ADD COLUMN IF NOT EXISTS "categoryId" UUID,
  ADD COLUMN IF NOT EXISTS "legacyCategory" VARCHAR(100);

DO $$ BEGIN
  ALTER TABLE "credits"
    ADD CONSTRAINT "credits_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "credits_categoryId_idx"     ON "credits"("categoryId");
CREATE INDEX IF NOT EXISTS "credits_legacyCategory_idx" ON "credits"("legacyCategory");

-- ── Add categoryId FK to events ────────────────────────────────────────────────

ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "categoryId" UUID;

DO $$ BEGIN
  ALTER TABLE "events"
    ADD CONSTRAINT "events_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "events_categoryId_idx" ON "events"("categoryId");
