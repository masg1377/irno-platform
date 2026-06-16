-- Phase 11.1: OTP-Based Irno ID Login & Student Account Activation
-- Adds: OtpPurpose enum, otp_codes table, activatedAt on users

-- OtpPurpose enum
DO $$ BEGIN
  CREATE TYPE "OtpPurpose" AS ENUM ('LOGIN', 'REGISTER', 'ACTIVATE_ACCOUNT', 'PASSWORD_RESET');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- activatedAt column on users (nullable — NULL means not yet activated via OTP)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMPTZ;

-- otp_codes table
CREATE TABLE IF NOT EXISTS "otp_codes" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "mobile"      VARCHAR(20) NOT NULL,
    "userId"      UUID,
    "codeHash"    VARCHAR(255) NOT NULL,
    "purpose"     "OtpPurpose" NOT NULL DEFAULT 'LOGIN',
    "expiresAt"   TIMESTAMPTZ NOT NULL,
    "consumedAt"  TIMESTAMPTZ,
    "attempts"    INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "otp_codes_mobile_createdAt_idx"
    ON "otp_codes"("mobile", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "otp_codes_mobile_consumedAt_expiresAt_idx"
    ON "otp_codes"("mobile", "consumedAt", "expiresAt");
