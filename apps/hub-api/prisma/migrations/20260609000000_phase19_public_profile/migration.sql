-- Phase 19: Public Live Resume & Portfolio Deep Experience
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "contactVisibilityConfig" JSONB;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "publicThemeConfig" JSONB;
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "seoTitle" VARCHAR(255);
ALTER TABLE "career_profiles" ADD COLUMN IF NOT EXISTS "seoDescription" VARCHAR(500);

ALTER TABLE "resume_documents" ADD COLUMN IF NOT EXISTS "allowPdfDownload" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "resume_documents" ADD COLUMN IF NOT EXISTS "publicThemeConfig" JSONB;

ALTER TABLE "portfolio_projects" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "portfolio_projects" ADD COLUMN IF NOT EXISTS "coverImageUrl" VARCHAR(500);
ALTER TABLE "portfolio_projects" ADD COLUMN IF NOT EXISTS "demoUrl" VARCHAR(500);
ALTER TABLE "portfolio_projects" ADD COLUMN IF NOT EXISTS "repoUrl" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "portfolio_projects_is_featured_idx" ON "portfolio_projects"("isFeatured");
