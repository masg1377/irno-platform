-- AlterTable
ALTER TABLE "applicant_notes" RENAME CONSTRAINT "lead_notes_pkey" TO "applicant_notes_pkey";

-- AlterTable
ALTER TABLE "applicants" RENAME CONSTRAINT "leads_pkey" TO "applicants_pkey";

-- RenameForeignKey
ALTER TABLE "applicant_notes" RENAME CONSTRAINT "lead_notes_authorId_fkey" TO "applicant_notes_authorId_fkey";

-- RenameForeignKey
ALTER TABLE "applicant_notes" RENAME CONSTRAINT "lead_notes_leadId_fkey" TO "applicant_notes_applicantId_fkey";

-- RenameForeignKey
ALTER TABLE "applicants" RENAME CONSTRAINT "leads_assignedToUserId_fkey" TO "applicants_assignedToUserId_fkey";

-- RenameForeignKey
ALTER TABLE "applicants" RENAME CONSTRAINT "leads_convertedToStudentId_fkey" TO "applicants_convertedToStudentId_fkey";

-- RenameForeignKey
ALTER TABLE "applicants" RENAME CONSTRAINT "leads_createdById_fkey" TO "applicants_createdById_fkey";

-- RenameIndex
ALTER INDEX "leads_assignedToUserId_idx" RENAME TO "applicants_assignedToUserId_idx";

-- RenameIndex
ALTER INDEX "leads_convertedAt_idx" RENAME TO "applicants_convertedAt_idx";

-- RenameIndex
ALTER INDEX "leads_convertedToStudentId_key" RENAME TO "applicants_convertedToStudentId_key";

-- RenameIndex
ALTER INDEX "leads_deletedAt_idx" RENAME TO "applicants_deletedAt_idx";

-- RenameIndex
ALTER INDEX "leads_followUpDate_idx" RENAME TO "applicants_followUpDate_idx";

-- RenameIndex
ALTER INDEX "leads_mobile_idx" RENAME TO "applicants_mobile_idx";

-- RenameIndex
ALTER INDEX "leads_source_idx" RENAME TO "applicants_source_idx";

-- RenameIndex
ALTER INDEX "leads_status_idx" RENAME TO "applicants_status_idx";
