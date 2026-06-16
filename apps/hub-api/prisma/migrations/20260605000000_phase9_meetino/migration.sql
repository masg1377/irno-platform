-- Phase 9: Meetino Integration
-- Creates: MeetinoMeetingReference, MeetinoAttendanceRecord tables
-- Adds: MEETINO_SESSION_ATTENDED, MEETINO_SESSION_MISSED to TimelineEventType
-- Adds: MeetinoMeetingSourceType, MeetinoMeetingStatus, MeetinoParticipantType enums

-- ── New enums ─────────────────────────────────────────────────────────────────

CREATE TYPE "MeetinoMeetingSourceType" AS ENUM (
  'COURSE_GROUP',
  'EVENT',
  'MANUAL',
  'FUTURE_SESSION'
);

CREATE TYPE "MeetinoMeetingStatus" AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'ENDED',
  'CANCELLED',
  'UNKNOWN'
);

CREATE TYPE "MeetinoParticipantType" AS ENUM (
  'REGISTERED',
  'GUEST'
);

-- ── Extend TimelineEventType ──────────────────────────────────────────────────

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'MEETINO_SESSION_ATTENDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'MEETINO_SESSION_MISSED';

-- ── MeetinoMeetingReference ───────────────────────────────────────────────────

CREATE TABLE "meetino_meeting_references" (
  "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
  "sourceType"       "MeetinoMeetingSourceType" NOT NULL,
  "sourceId"         UUID          NOT NULL,
  "meetinoMeetingId" VARCHAR(200),
  "meetinoSlug"      VARCHAR(200),
  "title"            VARCHAR(300)  NOT NULL,
  "joinUrl"          VARCHAR(500)  NOT NULL,
  "hostUrl"          VARCHAR(500),
  "status"           "MeetinoMeetingStatus" NOT NULL DEFAULT 'UNKNOWN',
  "startsAt"         TIMESTAMPTZ,
  "endsAt"           TIMESTAMPTZ,
  "createdById"      UUID          NOT NULL,
  "lastSyncedAt"     TIMESTAMPTZ,
  "metadata"         JSONB,
  "createdAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  "deletedAt"        TIMESTAMPTZ,

  CONSTRAINT "meetino_meeting_references_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "meetino_meeting_references_sourceType_sourceId_idx"
  ON "meetino_meeting_references" ("sourceType", "sourceId");

CREATE INDEX "meetino_meeting_references_meetinoMeetingId_idx"
  ON "meetino_meeting_references" ("meetinoMeetingId");

CREATE INDEX "meetino_meeting_references_meetinoSlug_idx"
  ON "meetino_meeting_references" ("meetinoSlug");

CREATE INDEX "meetino_meeting_references_status_idx"
  ON "meetino_meeting_references" ("status");

CREATE INDEX "meetino_meeting_references_startsAt_idx"
  ON "meetino_meeting_references" ("startsAt");

CREATE INDEX "meetino_meeting_references_deletedAt_idx"
  ON "meetino_meeting_references" ("deletedAt");

-- FK: createdById → users
ALTER TABLE "meetino_meeting_references"
  ADD CONSTRAINT "meetino_meeting_references_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── MeetinoAttendanceRecord ───────────────────────────────────────────────────

CREATE TABLE "meetino_attendance_records" (
  "id"                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  "referenceId"          UUID        NOT NULL,
  "meetinoParticipantId" VARCHAR(200),
  "userId"               UUID,
  "studentId"            UUID,
  "displayName"          VARCHAR(200) NOT NULL,
  "participantType"      "MeetinoParticipantType" NOT NULL DEFAULT 'REGISTERED',
  "joinedAt"             TIMESTAMPTZ,
  "leftAt"               TIMESTAMPTZ,
  "durationSeconds"      INTEGER,
  "wasGuest"             BOOLEAN      NOT NULL DEFAULT FALSE,
  "rawData"              JSONB,
  "createdAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "meetino_attendance_records_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "meetino_attendance_records_referenceId_idx"
  ON "meetino_attendance_records" ("referenceId");

CREATE INDEX "meetino_attendance_records_studentId_idx"
  ON "meetino_attendance_records" ("studentId");

CREATE INDEX "meetino_attendance_records_userId_idx"
  ON "meetino_attendance_records" ("userId");

CREATE INDEX "meetino_attendance_records_joinedAt_idx"
  ON "meetino_attendance_records" ("joinedAt");

-- FK: referenceId → meetino_meeting_references
ALTER TABLE "meetino_attendance_records"
  ADD CONSTRAINT "meetino_attendance_records_referenceId_fkey"
  FOREIGN KEY ("referenceId") REFERENCES "meetino_meeting_references" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
