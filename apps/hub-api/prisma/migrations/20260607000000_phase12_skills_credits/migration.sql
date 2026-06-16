-- Phase 12: Skills & Credits
-- All statements are idempotent per project migration rules.

-- ── New enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SkillStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CreditType" AS ENUM (
    'COURSE_COMPLETION', 'TEST_PASSED', 'MENTOR_APPROVAL', 'EVENT_ATTENDANCE',
    'INTERVIEW_READY', 'ACCESS_PERMISSION', 'MANUAL', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CreditStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentSkillLevel" AS ENUM ('LEARNING', 'BASIC', 'CONFIDENT', 'ADVANCED', 'MASTERED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentCreditStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend existing enums ─────────────────────────────────────────────────────

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'SKILL_AWARDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'SKILL_UPDATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CREDIT_AWARDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CREDIT_REVOKED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CREDIT_EXPIRED';

ALTER TYPE "EventEligibilityRuleType" ADD VALUE IF NOT EXISTS 'REQUIRED_SKILL';
ALTER TYPE "EventEligibilityRuleType" ADD VALUE IF NOT EXISTS 'REQUIRED_CREDIT';

-- ── Skill catalog ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "skills" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title"       VARCHAR(255) NOT NULL,
  "slug"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category"    VARCHAR(100),
  "level"       "SkillLevel" NOT NULL,
  "status"      "SkillStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"   TIMESTAMPTZ,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "skills_slug_key" ON "skills"("slug");
CREATE INDEX IF NOT EXISTS "skills_status_idx"    ON "skills"("status");
CREATE INDEX IF NOT EXISTS "skills_category_idx"  ON "skills"("category");
CREATE INDEX IF NOT EXISTS "skills_level_idx"     ON "skills"("level");
CREATE INDEX IF NOT EXISTS "skills_deletedAt_idx" ON "skills"("deletedAt");

-- ── Credit catalog ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "credits" (
  "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
  "title"            VARCHAR(255)  NOT NULL,
  "slug"             VARCHAR(255)  NOT NULL,
  "description"      TEXT,
  "type"             "CreditType"  NOT NULL,
  "status"           "CreditStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAfterDays" INTEGER,
  "createdAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "deletedAt"        TIMESTAMPTZ,
  CONSTRAINT "credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "credits_slug_key"      ON "credits"("slug");
CREATE INDEX IF NOT EXISTS "credits_type_idx"       ON "credits"("type");
CREATE INDEX IF NOT EXISTS "credits_status_idx"     ON "credits"("status");
CREATE INDEX IF NOT EXISTS "credits_deletedAt_idx"  ON "credits"("deletedAt");

-- ── Student skills ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "student_skills" (
  "id"           UUID              NOT NULL DEFAULT gen_random_uuid(),
  "studentId"    UUID              NOT NULL,
  "skillId"      UUID              NOT NULL,
  "level"        "StudentSkillLevel" NOT NULL,
  "sourceType"   VARCHAR(100),
  "sourceId"     UUID,
  "awardedById"  UUID              NOT NULL,
  "awardedAt"    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "evidenceNote" TEXT,
  "createdAt"    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_skills_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "student_skills_student_skill_unique" UNIQUE ("studentId", "skillId"),
  CONSTRAINT "student_skills_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_skills_skillId_fkey"   FOREIGN KEY ("skillId")   REFERENCES "skills"("id"),
  CONSTRAINT "student_skills_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "student_skills_studentId_idx" ON "student_skills"("studentId");
CREATE INDEX IF NOT EXISTS "student_skills_skillId_idx"   ON "student_skills"("skillId");
CREATE INDEX IF NOT EXISTS "student_skills_level_idx"     ON "student_skills"("level");
CREATE INDEX IF NOT EXISTS "student_skills_awardedAt_idx" ON "student_skills"("awardedAt");

-- ── Student credits ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "student_credits" (
  "id"           UUID                NOT NULL DEFAULT gen_random_uuid(),
  "studentId"    UUID                NOT NULL,
  "creditId"     UUID                NOT NULL,
  "status"       "StudentCreditStatus" NOT NULL DEFAULT 'ACTIVE',
  "sourceType"   VARCHAR(100),
  "sourceId"     UUID,
  "awardedById"  UUID                NOT NULL,
  "awardedAt"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "expiresAt"    TIMESTAMPTZ,
  "revokedAt"    TIMESTAMPTZ,
  "revokedById"  UUID,
  "evidenceNote" TEXT,
  "createdAt"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  CONSTRAINT "student_credits_pkey"             PRIMARY KEY ("id"),
  CONSTRAINT "student_credits_studentId_fkey"   FOREIGN KEY ("studentId")   REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "student_credits_creditId_fkey"    FOREIGN KEY ("creditId")    REFERENCES "credits"("id"),
  CONSTRAINT "student_credits_awardedById_fkey" FOREIGN KEY ("awardedById") REFERENCES "users"("id"),
  CONSTRAINT "student_credits_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id")
);

CREATE INDEX IF NOT EXISTS "student_credits_studentId_idx" ON "student_credits"("studentId");
CREATE INDEX IF NOT EXISTS "student_credits_creditId_idx"  ON "student_credits"("creditId");
CREATE INDEX IF NOT EXISTS "student_credits_status_idx"    ON "student_credits"("status");
CREATE INDEX IF NOT EXISTS "student_credits_expiresAt_idx" ON "student_credits"("expiresAt");
CREATE INDEX IF NOT EXISTS "student_credits_awardedAt_idx" ON "student_credits"("awardedAt");
