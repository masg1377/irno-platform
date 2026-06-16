-- Phase 12.2 — FK cleanup for student_skills and student_credits
-- student_skills and student_credits are created in phase12 (20260607000000),
-- so they exist at this timestamp. Made idempotent per project migration rules.

-- ── Drop FKs ──

ALTER TABLE "student_credits" DROP CONSTRAINT IF EXISTS "student_credits_awardedById_fkey";
ALTER TABLE "student_credits" DROP CONSTRAINT IF EXISTS "student_credits_creditId_fkey";
ALTER TABLE "student_credits" DROP CONSTRAINT IF EXISTS "student_credits_revokedById_fkey";
ALTER TABLE "student_credits" DROP CONSTRAINT IF EXISTS "student_credits_studentId_fkey";

ALTER TABLE "student_skills"  DROP CONSTRAINT IF EXISTS "student_skills_awardedById_fkey";
ALTER TABLE "student_skills"  DROP CONSTRAINT IF EXISTS "student_skills_skillId_fkey";
ALTER TABLE "student_skills"  DROP CONSTRAINT IF EXISTS "student_skills_studentId_fkey";

-- ── AlterTable ──

ALTER TABLE "credits"
  ALTER COLUMN "id"        DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "skills"
  ALTER COLUMN "id"        DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "student_credits"
  ALTER COLUMN "id"        DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "student_skills"
  ALTER COLUMN "id"        DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

-- ── Re-add FKs ──

DO $$ BEGIN
  ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_awardedById_fkey"
    FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_creditId_fkey"
    FOREIGN KEY ("creditId") REFERENCES "credits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_awardedById_fkey"
    FOREIGN KEY ("awardedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_credits" ADD CONSTRAINT "student_credits_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Rename index ──

DO $$ BEGIN
  ALTER INDEX "student_skills_student_skill_unique" RENAME TO "student_skills_studentId_skillId_key";
EXCEPTION WHEN undefined_object THEN NULL;
         WHEN undefined_table   THEN NULL;
         WHEN duplicate_table   THEN NULL;
END $$;
