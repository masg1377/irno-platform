-- Phase 14: Career Studio — Foundation
-- CareerProfile, ResumeDocument, ResumeSection, ResumeTemplate,
-- ResumeExport, ResumeCheckReport, PortfolioProject, Roadmap,
-- RoadmapNode, JobMatchReport

-- Enums
DO $$ BEGIN
  CREATE TYPE "CareerProfileVisibility" AS ENUM ('PRIVATE', 'PUBLIC_LINK', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeLanguage" AS ENUM ('FA', 'EN', 'FA_EN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeVisibility" AS ENUM ('PRIVATE', 'PUBLIC_LINK', 'DISABLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeSectionType" AS ENUM (
    'SUMMARY', 'EXPERIENCE', 'EDUCATION', 'PROJECT', 'SKILL',
    'CERTIFICATE', 'COURSE', 'CREDIT', 'EVENT', 'LANGUAGE',
    'LINK', 'CUSTOM', 'TEXT_BLOCK'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeTemplateType" AS ENUM (
    'ATS_FRIENDLY', 'MODERN', 'MINIMAL', 'CREATIVE', 'ACADEMIC', 'TECHNICAL'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeExportFormat" AS ENUM ('PDF', 'HTML');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeExportStatus" AS ENUM ('PENDING', 'GENERATED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "ResumeCheckSourceType" AS ENUM ('IRNO_RESUME', 'UPLOADED_FILE', 'TEXT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "RoadmapNodeType" AS ENUM ('TOPIC', 'SKILL', 'MILESTONE', 'RESOURCE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "RoadmapStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "PortfolioProjectVisibility" AS ENUM ('PRIVATE', 'PUBLIC_LINK', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- career_profiles
CREATE TABLE IF NOT EXISTS "career_profiles" (
  "id"             UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"         UUID        NOT NULL,
  "studentId"      UUID,
  "displayName"    VARCHAR(255) NOT NULL,
  "headline"       VARCHAR(500),
  "summary"        TEXT,
  "location"       VARCHAR(255),
  "phone"          VARCHAR(50),
  "email"          VARCHAR(255),
  "website"        VARCHAR(500),
  "linkedinUrl"    VARCHAR(500),
  "githubUrl"      VARCHAR(500),
  "portfolioUrl"   VARCHAR(500),
  "avatarUrl"      VARCHAR(500),
  "visibility"     "CareerProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
  "publicSlug"     VARCHAR(255),
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "career_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "career_profiles_userId_key" ON "career_profiles"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "career_profiles_publicSlug_key" ON "career_profiles"("publicSlug");
CREATE INDEX IF NOT EXISTS "career_profiles_visibility_idx" ON "career_profiles"("visibility");

-- resume_templates (create before resume_documents because of FK)
CREATE TABLE IF NOT EXISTS "resume_templates" (
  "id"                 UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title"              VARCHAR(255) NOT NULL,
  "slug"               VARCHAR(255) NOT NULL,
  "type"               "ResumeTemplateType" NOT NULL,
  "language"           "ResumeLanguage" NOT NULL DEFAULT 'FA_EN',
  "description"        TEXT,
  "previewUrl"         VARCHAR(500),
  "layoutConfig"       JSONB,
  "defaultStyleConfig" JSONB,
  "isPremium"          BOOLEAN NOT NULL DEFAULT FALSE,
  "isActive"           BOOLEAN NOT NULL DEFAULT TRUE,
  "supportsAts"        BOOLEAN NOT NULL DEFAULT FALSE,
  "supportsRtl"        BOOLEAN NOT NULL DEFAULT TRUE,
  "supportsLtr"        BOOLEAN NOT NULL DEFAULT TRUE,
  "sortOrder"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"          TIMESTAMPTZ,
  CONSTRAINT "resume_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "resume_templates_slug_key" ON "resume_templates"("slug");
CREATE INDEX IF NOT EXISTS "resume_templates_type_idx" ON "resume_templates"("type");
CREATE INDEX IF NOT EXISTS "resume_templates_isActive_idx" ON "resume_templates"("isActive");
CREATE INDEX IF NOT EXISTS "resume_templates_isPremium_idx" ON "resume_templates"("isPremium");
CREATE INDEX IF NOT EXISTS "resume_templates_supportsAts_idx" ON "resume_templates"("supportsAts");
CREATE INDEX IF NOT EXISTS "resume_templates_deletedAt_idx" ON "resume_templates"("deletedAt");

-- resume_documents
CREATE TABLE IF NOT EXISTS "resume_documents" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"          UUID        NOT NULL,
  "careerProfileId" UUID        NOT NULL,
  "title"           VARCHAR(500) NOT NULL,
  "targetRole"      VARCHAR(500),
  "language"        "ResumeLanguage" NOT NULL DEFAULT 'FA',
  "templateId"      UUID,
  "visibility"      "ResumeVisibility" NOT NULL DEFAULT 'PRIVATE',
  "publicSlug"      VARCHAR(255),
  "styleConfig"     JSONB,
  "settings"        JSONB,
  "lastExportedAt"  TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"       TIMESTAMPTZ,
  CONSTRAINT "resume_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "resume_documents_publicSlug_key" ON "resume_documents"("publicSlug");
CREATE INDEX IF NOT EXISTS "resume_documents_userId_idx" ON "resume_documents"("userId");
CREATE INDEX IF NOT EXISTS "resume_documents_careerProfileId_idx" ON "resume_documents"("careerProfileId");
CREATE INDEX IF NOT EXISTS "resume_documents_templateId_idx" ON "resume_documents"("templateId");
CREATE INDEX IF NOT EXISTS "resume_documents_visibility_idx" ON "resume_documents"("visibility");
CREATE INDEX IF NOT EXISTS "resume_documents_deletedAt_idx" ON "resume_documents"("deletedAt");
CREATE INDEX IF NOT EXISTS "resume_documents_createdAt_idx" ON "resume_documents"("createdAt");

-- resume_sections
CREATE TABLE IF NOT EXISTS "resume_sections" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "resumeDocumentId" UUID        NOT NULL,
  "type"             "ResumeSectionType" NOT NULL,
  "title"            VARCHAR(500) NOT NULL,
  "content"          JSONB       NOT NULL DEFAULT '{}',
  "layoutConfig"     JSONB,
  "styleConfig"      JSONB,
  "sortOrder"        INTEGER     NOT NULL DEFAULT 0,
  "isVisible"        BOOLEAN     NOT NULL DEFAULT TRUE,
  "isImported"       BOOLEAN     NOT NULL DEFAULT FALSE,
  "sourceType"       VARCHAR(100),
  "sourceId"         UUID,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "resume_sections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resume_sections_resumeDocumentId_idx" ON "resume_sections"("resumeDocumentId");
CREATE INDEX IF NOT EXISTS "resume_sections_type_idx" ON "resume_sections"("type");
CREATE INDEX IF NOT EXISTS "resume_sections_sortOrder_idx" ON "resume_sections"("sortOrder");

-- resume_exports
CREATE TABLE IF NOT EXISTS "resume_exports" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "resumeDocumentId" UUID        NOT NULL,
  "userId"           UUID        NOT NULL,
  "templateId"       UUID,
  "format"           "ResumeExportFormat" NOT NULL DEFAULT 'PDF',
  "status"           "ResumeExportStatus" NOT NULL DEFAULT 'PENDING',
  "fileUrl"          VARCHAR(1000),
  "htmlSnapshot"     TEXT,
  "includeWatermark" BOOLEAN     NOT NULL DEFAULT TRUE,
  "watermarkConfig"  JSONB,
  "generatedAt"      TIMESTAMPTZ,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "resume_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resume_exports_resumeDocumentId_idx" ON "resume_exports"("resumeDocumentId");
CREATE INDEX IF NOT EXISTS "resume_exports_userId_idx" ON "resume_exports"("userId");
CREATE INDEX IF NOT EXISTS "resume_exports_status_idx" ON "resume_exports"("status");
CREATE INDEX IF NOT EXISTS "resume_exports_createdAt_idx" ON "resume_exports"("createdAt");

-- resume_check_reports
CREATE TABLE IF NOT EXISTS "resume_check_reports" (
  "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
  "resumeDocumentId"    UUID,
  "userId"              UUID        NOT NULL,
  "sourceType"          "ResumeCheckSourceType" NOT NULL DEFAULT 'IRNO_RESUME',
  "overallScore"        INTEGER     NOT NULL DEFAULT 0,
  "atsScore"            INTEGER     NOT NULL DEFAULT 0,
  "hrScanScore"         INTEGER     NOT NULL DEFAULT 0,
  "structureScore"      INTEGER     NOT NULL DEFAULT 0,
  "keywordScore"        INTEGER     NOT NULL DEFAULT 0,
  "achievementScore"    INTEGER     NOT NULL DEFAULT 0,
  "formattingRiskScore" INTEGER     NOT NULL DEFAULT 0,
  "completenessScore"   INTEGER     NOT NULL DEFAULT 0,
  "findings"            JSONB       NOT NULL DEFAULT '[]',
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "resume_check_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "resume_check_reports_resumeDocumentId_idx" ON "resume_check_reports"("resumeDocumentId");
CREATE INDEX IF NOT EXISTS "resume_check_reports_userId_idx" ON "resume_check_reports"("userId");
CREATE INDEX IF NOT EXISTS "resume_check_reports_createdAt_idx" ON "resume_check_reports"("createdAt");

-- portfolio_projects
CREATE TABLE IF NOT EXISTS "portfolio_projects" (
  "id"              UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"          UUID        NOT NULL,
  "careerProfileId" UUID        NOT NULL,
  "studentId"       UUID,
  "title"           VARCHAR(500) NOT NULL,
  "role"            VARCHAR(255),
  "description"     TEXT,
  "technologies"    JSONB       NOT NULL DEFAULT '[]',
  "links"           JSONB,
  "images"          JSONB,
  "caseStudy"       JSONB,
  "startDate"       TIMESTAMPTZ,
  "endDate"         TIMESTAMPTZ,
  "visibility"      "PortfolioProjectVisibility" NOT NULL DEFAULT 'PRIVATE',
  "sortOrder"       INTEGER     NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"       TIMESTAMPTZ,
  CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "portfolio_projects_userId_idx" ON "portfolio_projects"("userId");
CREATE INDEX IF NOT EXISTS "portfolio_projects_careerProfileId_idx" ON "portfolio_projects"("careerProfileId");
CREATE INDEX IF NOT EXISTS "portfolio_projects_visibility_idx" ON "portfolio_projects"("visibility");
CREATE INDEX IF NOT EXISTS "portfolio_projects_sortOrder_idx" ON "portfolio_projects"("sortOrder");
CREATE INDEX IF NOT EXISTS "portfolio_projects_deletedAt_idx" ON "portfolio_projects"("deletedAt");

-- roadmaps
CREATE TABLE IF NOT EXISTS "roadmaps" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "title"       VARCHAR(500) NOT NULL,
  "slug"        VARCHAR(255) NOT NULL,
  "description" TEXT,
  "language"    "ResumeLanguage" NOT NULL DEFAULT 'FA_EN',
  "status"      "RoadmapStatus" NOT NULL DEFAULT 'DRAFT',
  "metadata"    JSONB,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "roadmaps_slug_key" ON "roadmaps"("slug");
CREATE INDEX IF NOT EXISTS "roadmaps_status_idx" ON "roadmaps"("status");
CREATE INDEX IF NOT EXISTS "roadmaps_language_idx" ON "roadmaps"("language");

-- roadmap_nodes
CREATE TABLE IF NOT EXISTS "roadmap_nodes" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "roadmapId"   UUID        NOT NULL,
  "title"       VARCHAR(500) NOT NULL,
  "description" TEXT,
  "type"        "RoadmapNodeType" NOT NULL DEFAULT 'TOPIC',
  "sortOrder"   INTEGER     NOT NULL DEFAULT 0,
  "parentId"    UUID,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "roadmap_nodes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "roadmap_nodes_roadmapId_idx" ON "roadmap_nodes"("roadmapId");
CREATE INDEX IF NOT EXISTS "roadmap_nodes_parentId_idx" ON "roadmap_nodes"("parentId");
CREATE INDEX IF NOT EXISTS "roadmap_nodes_type_idx" ON "roadmap_nodes"("type");
CREATE INDEX IF NOT EXISTS "roadmap_nodes_sortOrder_idx" ON "roadmap_nodes"("sortOrder");

-- job_match_reports
CREATE TABLE IF NOT EXISTS "job_match_reports" (
  "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
  "userId"           UUID        NOT NULL,
  "careerProfileId"  UUID        NOT NULL,
  "resumeDocumentId" UUID,
  "jobTitle"         VARCHAR(500),
  "jobDescription"   TEXT        NOT NULL,
  "overallScore"     INTEGER,
  "keywordScore"     INTEGER,
  "skillGap"         JSONB,
  "recommendations"  JSONB,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "job_match_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "job_match_reports_userId_idx" ON "job_match_reports"("userId");
CREATE INDEX IF NOT EXISTS "job_match_reports_careerProfileId_idx" ON "job_match_reports"("careerProfileId");
CREATE INDEX IF NOT EXISTS "job_match_reports_resumeDocumentId_idx" ON "job_match_reports"("resumeDocumentId");
CREATE INDEX IF NOT EXISTS "job_match_reports_createdAt_idx" ON "job_match_reports"("createdAt");

-- Foreign Keys
ALTER TABLE "career_profiles" ADD CONSTRAINT "career_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_careerProfileId_fkey"
  FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "resume_templates"("id") ON DELETE SET NULL;

ALTER TABLE "resume_sections" ADD CONSTRAINT "resume_sections_resumeDocumentId_fkey"
  FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE CASCADE;

ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_resumeDocumentId_fkey"
  FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE CASCADE;
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id");
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "resume_templates"("id") ON DELETE SET NULL;

ALTER TABLE "resume_check_reports" ADD CONSTRAINT "resume_check_reports_resumeDocumentId_fkey"
  FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE SET NULL;
ALTER TABLE "resume_check_reports" ADD CONSTRAINT "resume_check_reports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id");

ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_careerProfileId_fkey"
  FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE;

ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_roadmapId_fkey"
  FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE;
ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "roadmap_nodes"("id");

ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id");
ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_careerProfileId_fkey"
  FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE;
ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_resumeDocumentId_fkey"
  FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE SET NULL;
