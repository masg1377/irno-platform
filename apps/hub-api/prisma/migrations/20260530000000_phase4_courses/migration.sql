-- Phase 4: Courses and Course Groups
-- Adds Course, CourseGroup, CourseGroupMentor tables
-- Adds interestedCourseId to Applicant

-- Create Phase 4 enums
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL_LEVELS');
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "CourseGroupStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- Create courses table
CREATE TABLE "courses" (
    "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
    "title"                VARCHAR(200) NOT NULL,
    "slug"                 VARCHAR(100) NOT NULL,
    "description"          TEXT,
    "category"             VARCHAR(100) NOT NULL,
    "level"                "CourseLevel" NOT NULL DEFAULT 'ALL_LEVELS',
    "defaultTuitionToman"  INTEGER,
    "status"               "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById"          UUID NOT NULL,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"            TIMESTAMPTZ,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");
CREATE INDEX "courses_status_idx" ON "courses"("status");
CREATE INDEX "courses_category_idx" ON "courses"("category");
CREATE INDEX "courses_level_idx" ON "courses"("level");
CREATE INDEX "courses_deletedAt_idx" ON "courses"("deletedAt");

ALTER TABLE "courses" ADD CONSTRAINT "courses_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create course_groups table
CREATE TABLE "course_groups" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "courseId"       UUID NOT NULL,
    "name"           VARCHAR(200) NOT NULL,
    "teacherId"      UUID,
    "startDate"      TIMESTAMPTZ,
    "endDate"        TIMESTAMPTZ,
    "scheduleNotes"  TEXT,
    "capacity"       INTEGER,
    "status"         "CourseGroupStatus" NOT NULL DEFAULT 'UPCOMING',
    "meetinoRoomId"  VARCHAR(100),
    "createdById"    UUID NOT NULL,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt"      TIMESTAMPTZ,

    CONSTRAINT "course_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "course_groups_courseId_idx" ON "course_groups"("courseId");
CREATE INDEX "course_groups_teacherId_idx" ON "course_groups"("teacherId");
CREATE INDEX "course_groups_status_idx" ON "course_groups"("status");
CREATE INDEX "course_groups_startDate_idx" ON "course_groups"("startDate");
CREATE INDEX "course_groups_deletedAt_idx" ON "course_groups"("deletedAt");

ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "course_groups" ADD CONSTRAINT "course_groups_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create course_group_mentors table
CREATE TABLE "course_group_mentors" (
    "courseGroupId"  UUID NOT NULL,
    "userId"         UUID NOT NULL,
    "assignedAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_group_mentors_pkey" PRIMARY KEY ("courseGroupId", "userId")
);

CREATE INDEX "course_group_mentors_userId_idx" ON "course_group_mentors"("userId");

ALTER TABLE "course_group_mentors" ADD CONSTRAINT "course_group_mentors_courseGroupId_fkey"
    FOREIGN KEY ("courseGroupId") REFERENCES "course_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "course_group_mentors" ADD CONSTRAINT "course_group_mentors_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add interestedCourseId to applicants
ALTER TABLE "applicants" ADD COLUMN "interestedCourseId" UUID;
CREATE INDEX "applicants_interestedCourseId_idx" ON "applicants"("interestedCourseId");
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_interestedCourseId_fkey"
    FOREIGN KEY ("interestedCourseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
