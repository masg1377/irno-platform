-- ──────────────────────────────────────────────────────────────
-- Migration: rename_lead_to_applicant
-- Renames all Lead/LeadNote/LeadStatus/LeadSource DB objects
-- to Applicant/ApplicantNote/ApplicantStatus/ApplicantSource.
-- Also updates TimelineEventType and AssignmentTargetType values.
-- ──────────────────────────────────────────────────────────────

-- 1. Create new ApplicantStatus enum
CREATE TYPE "ApplicantStatus" AS ENUM (
  'NEW_APPLICANT',
  'CONTACTED',
  'CONSULTED',
  'READY_TO_REGISTER',
  'REGISTERED',
  'NEEDS_FOLLOW_UP',
  'NOT_INTERESTED',
  'CANCELLED'
);

-- 2. Create new ApplicantSource enum (same values as LeadSource)
CREATE TYPE "ApplicantSource" AS ENUM (
  'INSTAGRAM',
  'REFERRAL',
  'WEBSITE',
  'PHONE',
  'TELEGRAM',
  'WHATSAPP',
  'IN_PERSON',
  'OTHER'
);

-- 3. Create new TimelineEventType enum with APPLICANT_ prefix
CREATE TYPE "TimelineEventType_new" AS ENUM (
  'APPLICANT_CREATED',
  'APPLICANT_STATUS_CHANGED',
  'APPLICANT_NOTE_ADDED',
  'APPLICANT_CONVERTED_TO_STUDENT',
  'STUDENT_CREATED',
  'STUDENT_NOTE_ADDED',
  'STUDENT_STATUS_CHANGED'
);

-- 4. Create new AssignmentTargetType enum with APPLICANT instead of LEAD
CREATE TYPE "AssignmentTargetType_new" AS ENUM (
  'APPLICANT',
  'STUDENT'
);

-- 5. Rename tables: leads → applicants, lead_notes → applicant_notes
ALTER TABLE "leads" RENAME TO "applicants";
ALTER TABLE "lead_notes" RENAME TO "applicant_notes";

-- 6. Rename the leadId column in applicant_notes → applicantId
ALTER TABLE "applicant_notes" RENAME COLUMN "leadId" TO "applicantId";

-- 7. Rename originLeadId → originApplicantId in students
ALTER TABLE "students" RENAME COLUMN "originLeadId" TO "originApplicantId";

-- 8. Migrate leads.status column from LeadStatus → ApplicantStatus
--    Map old values to new values:
--    NEW_LEAD           → NEW_APPLICANT
--    ACTIVE_STUDENT     → REGISTERED  (closest equivalent)
--    PAYMENT_PENDING    → READY_TO_REGISTER
--    GRADUATED          → REGISTERED
--    Others keep same name
ALTER TABLE "applicants"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ApplicantStatus" USING (
    CASE "status"::text
      WHEN 'NEW_LEAD'        THEN 'NEW_APPLICANT'
      WHEN 'ACTIVE_STUDENT'  THEN 'REGISTERED'
      WHEN 'PAYMENT_PENDING' THEN 'READY_TO_REGISTER'
      WHEN 'GRADUATED'       THEN 'REGISTERED'
      WHEN 'CONTACTED'       THEN 'CONTACTED'
      WHEN 'CONSULTED'       THEN 'CONSULTED'
      WHEN 'REGISTERED'      THEN 'REGISTERED'
      WHEN 'NEEDS_FOLLOW_UP' THEN 'NEEDS_FOLLOW_UP'
      WHEN 'CANCELLED'       THEN 'CANCELLED'
      ELSE 'NEW_APPLICANT'
    END
  )::"ApplicantStatus",
  ALTER COLUMN "status" SET DEFAULT 'NEW_APPLICANT'::"ApplicantStatus";

-- 9. Migrate leads.source column from LeadSource → ApplicantSource
ALTER TABLE "applicants"
  ALTER COLUMN "source" DROP DEFAULT,
  ALTER COLUMN "source" TYPE "ApplicantSource" USING ("source"::text::"ApplicantSource"),
  ALTER COLUMN "source" SET DEFAULT 'OTHER'::"ApplicantSource";

-- 10. Drop old LeadStatus and LeadSource enums
DROP TYPE "LeadStatus";
DROP TYPE "LeadSource";

-- 11. Migrate student_timeline_events.eventType from old → new enum
ALTER TABLE "student_timeline_events"
  ALTER COLUMN "eventType" TYPE "TimelineEventType_new" USING (
    CASE "eventType"::text
      WHEN 'LEAD_CREATED'             THEN 'APPLICANT_CREATED'
      WHEN 'LEAD_STATUS_CHANGED'      THEN 'APPLICANT_STATUS_CHANGED'
      WHEN 'LEAD_NOTE_ADDED'          THEN 'APPLICANT_NOTE_ADDED'
      WHEN 'LEAD_CONVERTED_TO_STUDENT' THEN 'APPLICANT_CONVERTED_TO_STUDENT'
      WHEN 'STUDENT_CREATED'          THEN 'STUDENT_CREATED'
      WHEN 'STUDENT_NOTE_ADDED'       THEN 'STUDENT_NOTE_ADDED'
      WHEN 'STUDENT_STATUS_CHANGED'   THEN 'STUDENT_STATUS_CHANGED'
      ELSE 'STUDENT_CREATED'
    END
  )::"TimelineEventType_new";

-- Drop old TimelineEventType and rename new one
DROP TYPE "TimelineEventType";
ALTER TYPE "TimelineEventType_new" RENAME TO "TimelineEventType";

-- 12. Migrate staff_assignments.targetType from old → new enum
ALTER TABLE "staff_assignments"
  ALTER COLUMN "targetType" TYPE "AssignmentTargetType_new" USING (
    CASE "targetType"::text
      WHEN 'LEAD'    THEN 'APPLICANT'
      WHEN 'STUDENT' THEN 'STUDENT'
      ELSE 'APPLICANT'
    END
  )::"AssignmentTargetType_new";

-- Drop old AssignmentTargetType and rename new one
DROP TYPE "AssignmentTargetType";
ALTER TYPE "AssignmentTargetType_new" RENAME TO "AssignmentTargetType";

-- 13. Rename foreign key constraints and indexes for clarity (optional but clean)
-- Rename applicants table sequences/constraints if needed — Postgres handles these automatically on table rename.

-- 14. Recreate index on applicant_notes.applicantId (was leadId)
DROP INDEX IF EXISTS "lead_notes_leadId_idx";
CREATE INDEX "applicant_notes_applicantId_idx" ON "applicant_notes"("applicantId");

-- 15. Update students index for originApplicantId
DROP INDEX IF EXISTS "students_originLeadId_idx";
CREATE INDEX "students_originApplicantId_idx" ON "students"("originApplicantId");
