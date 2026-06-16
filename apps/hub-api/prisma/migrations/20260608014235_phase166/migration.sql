-- DropForeignKey
ALTER TABLE "career_profiles" DROP CONSTRAINT "career_profiles_userId_fkey";

-- DropForeignKey
ALTER TABLE "courses" DROP CONSTRAINT "courses_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "credits" DROP CONSTRAINT "credits_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "events" DROP CONSTRAINT "events_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "job_match_reports" DROP CONSTRAINT "job_match_reports_careerProfileId_fkey";

-- DropForeignKey
ALTER TABLE "job_match_reports" DROP CONSTRAINT "job_match_reports_resumeDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "job_match_reports" DROP CONSTRAINT "job_match_reports_userId_fkey";

-- DropForeignKey
ALTER TABLE "portfolio_projects" DROP CONSTRAINT "portfolio_projects_careerProfileId_fkey";

-- DropForeignKey
ALTER TABLE "portfolio_projects" DROP CONSTRAINT "portfolio_projects_userId_fkey";

-- DropForeignKey
ALTER TABLE "resume_check_reports" DROP CONSTRAINT "resume_check_reports_resumeDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "resume_check_reports" DROP CONSTRAINT "resume_check_reports_userId_fkey";

-- DropForeignKey
ALTER TABLE "resume_documents" DROP CONSTRAINT "resume_documents_careerProfileId_fkey";

-- DropForeignKey
ALTER TABLE "resume_documents" DROP CONSTRAINT "resume_documents_templateId_fkey";

-- DropForeignKey
ALTER TABLE "resume_documents" DROP CONSTRAINT "resume_documents_userId_fkey";

-- DropForeignKey
ALTER TABLE "resume_exports" DROP CONSTRAINT "resume_exports_resumeDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "resume_exports" DROP CONSTRAINT "resume_exports_templateId_fkey";

-- DropForeignKey
ALTER TABLE "resume_exports" DROP CONSTRAINT "resume_exports_userId_fkey";

-- DropForeignKey
ALTER TABLE "resume_sections" DROP CONSTRAINT "resume_sections_resumeDocumentId_fkey";

-- DropForeignKey
ALTER TABLE "roadmap_nodes" DROP CONSTRAINT "roadmap_nodes_parentId_fkey";

-- DropForeignKey
ALTER TABLE "roadmap_nodes" DROP CONSTRAINT "roadmap_nodes_roadmapId_fkey";

-- DropForeignKey
ALTER TABLE "skills" DROP CONSTRAINT "skills_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "student_certificates" DROP CONSTRAINT "student_certificates_issuedById_fkey";

-- DropForeignKey
ALTER TABLE "student_certificates" DROP CONSTRAINT "student_certificates_revokedById_fkey";

-- DropForeignKey
ALTER TABLE "student_certificates" DROP CONSTRAINT "student_certificates_studentId_fkey";

-- DropForeignKey
ALTER TABLE "student_certificates" DROP CONSTRAINT "student_certificates_templateId_fkey";

-- DropForeignKey
ALTER TABLE "taxonomy_terms" DROP CONSTRAINT "taxonomy_terms_parentId_fkey";

-- DropIndex
DROP INDEX "courses_legacyCategory_idx";

-- DropIndex
DROP INDEX "credits_legacyCategory_idx";

-- DropIndex
DROP INDEX "skills_legacyCategory_idx";

-- AlterTable
ALTER TABLE "career_profiles" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "certificate_templates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "job_match_reports" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "portfolio_projects" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resume_check_reports" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "findings" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resume_documents" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resume_exports" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resume_sections" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "content" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "resume_templates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roadmap_nodes" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "roadmaps" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "student_certificates" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "taxonomy_terms" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "career_profiles_userId_idx" ON "career_profiles"("userId");

-- CreateIndex
CREATE INDEX "career_profiles_publicSlug_idx" ON "career_profiles"("publicSlug");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credits" ADD CONSTRAINT "credits_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "taxonomy_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "certificate_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_certificates" ADD CONSTRAINT "student_certificates_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "career_profiles" ADD CONSTRAINT "career_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_documents" ADD CONSTRAINT "resume_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "resume_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_sections" ADD CONSTRAINT "resume_sections_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_exports" ADD CONSTRAINT "resume_exports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "resume_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_check_reports" ADD CONSTRAINT "resume_check_reports_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resume_check_reports" ADD CONSTRAINT "resume_check_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "roadmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_nodes" ADD CONSTRAINT "roadmap_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "roadmap_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_careerProfileId_fkey" FOREIGN KEY ("careerProfileId") REFERENCES "career_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_match_reports" ADD CONSTRAINT "job_match_reports_resumeDocumentId_fkey" FOREIGN KEY ("resumeDocumentId") REFERENCES "resume_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "taxonomy_terms_sortOrder_idx" RENAME TO "taxonomy_terms_type_sortOrder_idx";

-- RenameIndex
ALTER INDEX "taxonomy_terms_type_slug_unique" RENAME TO "taxonomy_terms_type_slug_key";
