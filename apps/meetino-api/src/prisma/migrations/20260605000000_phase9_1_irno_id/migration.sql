-- Phase 9.1: Irno ID and Meetino Identity Alignment
-- Adds external identity fields to users and meeting_participants so that
-- Hub-authenticated users can be traced back to their Irno Hub identity.
-- Guests remain meeting-scoped and are NOT affected by this migration.

-- ── users ────────────────────────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "external_identity_provider" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "hub_user_id"                VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "hub_student_id"             VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "role_from_hub"              VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "last_identity_sync_at"      TIMESTAMPTZ(6);

-- Standard unique index (non-partial) to match Prisma @unique on hubUserId
CREATE UNIQUE INDEX IF NOT EXISTS "users_hub_user_id_key" ON "users"("hub_user_id");

CREATE INDEX IF NOT EXISTS "users_hub_user_id_idx" ON "users"("hub_user_id")
  WHERE "hub_user_id" IS NOT NULL;

-- ── meeting_participants ──────────────────────────────────────────────────────

ALTER TABLE "meeting_participants"
  ADD COLUMN IF NOT EXISTS "hub_user_id"    VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "hub_student_id" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "meeting_participants_hub_user_id_idx" ON "meeting_participants"("hub_user_id")
  WHERE "hub_user_id" IS NOT NULL;
