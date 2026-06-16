-- Phase 13: Certificates & Verifiable Credentials
-- All statements are idempotent per project migration rules.

-- ── New enums ─────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "CertificateTemplateType" AS ENUM (
    'COURSE_COMPLETION', 'EVENT_ATTENDANCE', 'SKILL_CREDIT', 'MANUAL', 'WORKSHOP', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CertificateLanguage" AS ENUM ('FA', 'EN', 'FA_EN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentCertificateStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StudentCertificateSourceType" AS ENUM (
    'COURSE', 'COURSE_GROUP', 'ENROLLMENT', 'CREDIT', 'EVENT', 'MANUAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Extend TimelineEventType ──────────────────────────────────────────────────

DO $$ BEGIN
  ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_ISSUED';
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'CERTIFICATE_REVOKED';
EXCEPTION WHEN others THEN NULL; END $$;

-- ── certificate_templates ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "certificate_templates" (
  "id"           UUID NOT NULL DEFAULT gen_random_uuid(),
  "title"        VARCHAR(255) NOT NULL,
  "slug"         VARCHAR(255) NOT NULL,
  "description"  TEXT,
  "type"         "CertificateTemplateType" NOT NULL,
  "language"     "CertificateLanguage" NOT NULL DEFAULT 'FA',
  "layoutConfig" JSONB,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deletedAt"    TIMESTAMPTZ,
  CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "certificate_templates_slug_key"
  ON "certificate_templates"("slug");

CREATE INDEX IF NOT EXISTS "certificate_templates_type_idx"
  ON "certificate_templates"("type");

CREATE INDEX IF NOT EXISTS "certificate_templates_isActive_idx"
  ON "certificate_templates"("isActive");

CREATE INDEX IF NOT EXISTS "certificate_templates_deletedAt_idx"
  ON "certificate_templates"("deletedAt");

-- ── student_certificates ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "student_certificates" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentId"           UUID NOT NULL,
  "templateId"          UUID,
  "title"               VARCHAR(500) NOT NULL,
  "certificateNumber"   VARCHAR(100) NOT NULL,
  "type"                "CertificateTemplateType" NOT NULL,
  "status"              "StudentCertificateStatus" NOT NULL DEFAULT 'ACTIVE',
  "issuedAt"            TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expiresAt"           TIMESTAMPTZ,
  "sourceType"          "StudentCertificateSourceType",
  "sourceId"            UUID,
  "issuedById"          UUID NOT NULL,
  "verificationCode"    VARCHAR(100) NOT NULL,
  "publicVerifyEnabled" BOOLEAN NOT NULL DEFAULT true,
  "metadata"            JSONB,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "revokedAt"           TIMESTAMPTZ,
  "revokedById"         UUID,
  "revokeReason"        TEXT,
  CONSTRAINT "student_certificates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "student_certificates_certificateNumber_key"
  ON "student_certificates"("certificateNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "student_certificates_verificationCode_key"
  ON "student_certificates"("verificationCode");

CREATE INDEX IF NOT EXISTS "student_certificates_studentId_idx"
  ON "student_certificates"("studentId");

CREATE INDEX IF NOT EXISTS "student_certificates_status_idx"
  ON "student_certificates"("status");

CREATE INDEX IF NOT EXISTS "student_certificates_sourceType_sourceId_idx"
  ON "student_certificates"("sourceType", "sourceId");

CREATE INDEX IF NOT EXISTS "student_certificates_issuedAt_idx"
  ON "student_certificates"("issuedAt");

-- ── Foreign keys (using exception pattern — PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS) ───

DO $$ BEGIN
  ALTER TABLE "student_certificates"
    ADD CONSTRAINT "student_certificates_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates"
    ADD CONSTRAINT "student_certificates_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates"
    ADD CONSTRAINT "student_certificates_issuedById_fkey"
    FOREIGN KEY ("issuedById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "student_certificates"
    ADD CONSTRAINT "student_certificates_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "users"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
