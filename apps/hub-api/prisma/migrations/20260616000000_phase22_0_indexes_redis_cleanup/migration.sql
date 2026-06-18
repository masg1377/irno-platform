-- Phase 22.0 — PostgreSQL query optimisation: compound indexes
-- All statements are idempotent (IF NOT EXISTS).

-- ResumeSection: fetch + sort sections for a resume in one index scan
CREATE INDEX IF NOT EXISTS "resume_sections_resumeDocumentId_sortOrder_idx"
  ON "resume_sections"("resumeDocumentId", "sortOrder");

-- ResumeExport: list exports for a specific resume filtered by status
CREATE INDEX IF NOT EXISTS "resume_exports_resumeDocumentId_status_idx"
  ON "resume_exports"("resumeDocumentId", "status");

-- ResumeExport: list all user exports ordered by date (portal / admin views)
CREATE INDEX IF NOT EXISTS "resume_exports_userId_createdAt_idx"
  ON "resume_exports"("userId", "createdAt" DESC);

-- ResumeCheckReport: list user reports ordered by date (listReports endpoint)
CREATE INDEX IF NOT EXISTS "resume_check_reports_userId_createdAt_idx"
  ON "resume_check_reports"("userId", "createdAt" DESC);

-- PortfolioProject: public profile query — filter by profile + visibility + not-deleted
-- Partial index: only non-deleted rows are queried publicly, reducing index size
CREATE INDEX IF NOT EXISTS "portfolio_projects_careerProfileId_visibility_deletedAt_idx"
  ON "portfolio_projects"("careerProfileId", "visibility", "deletedAt");

-- JobMatchReport: list user job match reports ordered by date (listJobMatchReports endpoint)
CREATE INDEX IF NOT EXISTS "job_match_reports_careerProfileId_createdAt_idx"
  ON "job_match_reports"("careerProfileId", "createdAt" DESC);
