-- Phase 13.3 — FK cleanup and index renames
-- This migration was auto-generated on a dev DB where taxonomy_terms,
-- certificate_templates, and student_certificates already existed.
-- Its timestamp places it BEFORE those tables are created in shadow DB replay,
-- so all operations are wrapped to be idempotent per project migration rules.

-- ── Drop FKs — tables that exist at this timestamp (courses, credits, events, skills) ──

ALTER TABLE "courses"       DROP CONSTRAINT IF EXISTS "courses_categoryId_fkey";
ALTER TABLE "credits"       DROP CONSTRAINT IF EXISTS "credits_categoryId_fkey";
ALTER TABLE "events"        DROP CONSTRAINT IF EXISTS "events_categoryId_fkey";
ALTER TABLE "skills"        DROP CONSTRAINT IF EXISTS "skills_categoryId_fkey";

-- ── Drop FKs — taxonomy_terms may not exist at this replay point ──

DO $$ BEGIN
  ALTER TABLE "taxonomy_terms" DROP CONSTRAINT IF EXISTS "taxonomy_terms_parentId_fkey";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── Drop FKs — student_certificates may not exist at this replay point ──

DO $$ BEGIN
  ALTER TABLE "student_certificates" DROP CONSTRAINT IF EXISTS "student_certificates_issuedById_fkey";
  ALTER TABLE "student_certificates" DROP CONSTRAINT IF EXISTS "student_certificates_revokedById_fkey";
  ALTER TABLE "student_certificates" DROP CONSTRAINT IF EXISTS "student_certificates_studentId_fkey";
  ALTER TABLE "student_certificates" DROP CONSTRAINT IF EXISTS "student_certificates_templateId_fkey";
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── Drop indexes ──

DROP INDEX IF EXISTS "courses_legacyCategory_idx";
DROP INDEX IF EXISTS "credits_legacyCategory_idx";
DROP INDEX IF EXISTS "skills_legacyCategory_idx";

-- ── AlterTable certificate_templates — may not exist at this replay point ──

DO $$ BEGIN
  ALTER TABLE "certificate_templates"
    ALTER COLUMN "id"        DROP DEFAULT,
    ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── AlterTable student_certificates — may not exist at this replay point ──

DO $$ BEGIN
  ALTER TABLE "student_certificates"
    ALTER COLUMN "id"        DROP DEFAULT,
    ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── AlterTable taxonomy_terms — may not exist at this replay point ──

DO $$ BEGIN
  ALTER TABLE "taxonomy_terms"
    ALTER COLUMN "id"        DROP DEFAULT,
    ALTER COLUMN "updatedAt" DROP DEFAULT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── Re-add FKs — taxonomy_terms and categoryId columns may not exist yet ──

DO $$ BEGIN
  ALTER TABLE "courses" ADD CONSTRAINT "courses_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "skills" ADD CONSTRAINT "skills_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "credits" ADD CONSTRAINT "credits_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_column THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN undefined_table  THEN NULL;
END $$;

-- ── Rename indexes — may not exist at this replay point ──

DO $$ BEGIN
  ALTER INDEX "taxonomy_terms_sortOrder_idx"   RENAME TO "taxonomy_terms_type_sortOrder_idx";
EXCEPTION WHEN undefined_object THEN NULL;
         WHEN undefined_table   THEN NULL;
         WHEN duplicate_table   THEN NULL;
END $$;

DO $$ BEGIN
  ALTER INDEX "taxonomy_terms_type_slug_unique" RENAME TO "taxonomy_terms_type_slug_key";
EXCEPTION WHEN undefined_object THEN NULL;
         WHEN undefined_table   THEN NULL;
         WHEN duplicate_table   THEN NULL;
END $$;
