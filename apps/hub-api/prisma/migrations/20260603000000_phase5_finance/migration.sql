-- Phase 5: Finance — Enrollment, Payment, PaymentTransaction, Installment
-- Also adds interestedCourseGroupId to applicants
-- Also adds Phase 5 timeline event types to TimelineEventType enum

-- ── New Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "EnrollmentStatus" AS ENUM (
  'PENDING',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'UNPAID',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'REFUNDED',
  'FREE'
);

CREATE TYPE "PaymentMethod" AS ENUM (
  'CASH',
  'CARD',
  'BANK_TRANSFER',
  'CHEQUE',
  'OTHER'
);

CREATE TYPE "InstallmentStatus" AS ENUM (
  'PENDING',
  'PAID',
  'OVERDUE',
  'WAIVED'
);

-- ── Extend TimelineEventType ─────────────────────────────────────────────────

ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'ENROLLMENT_STATUS_CHANGED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_RECORDED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'PAYMENT_COMPLETED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'INSTALLMENT_CREATED';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'INSTALLMENT_OVERDUE';
ALTER TYPE "TimelineEventType" ADD VALUE IF NOT EXISTS 'INSTALLMENT_PAID';

-- ── Applicant: add interestedCourseGroupId ───────────────────────────────────

ALTER TABLE "applicants"
  ADD COLUMN "interestedCourseGroupId" UUID;

ALTER TABLE "applicants"
  ADD CONSTRAINT "applicants_interestedCourseGroupId_fkey"
  FOREIGN KEY ("interestedCourseGroupId")
  REFERENCES "course_groups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "applicants_interestedCourseGroupId_idx"
  ON "applicants"("interestedCourseGroupId");

-- ── enrollments ──────────────────────────────────────────────────────────────

CREATE TABLE "enrollments" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "studentId"            UUID NOT NULL,
  "courseId"             UUID NOT NULL,
  "courseGroupId"        UUID,
  "status"               "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
  "tuitionAmountToman"   INTEGER NOT NULL,
  "discountAmountToman"  INTEGER NOT NULL DEFAULT 0,
  "finalAmountToman"     INTEGER NOT NULL,
  "enrollmentDate"       TIMESTAMPTZ NOT NULL,
  "notes"                TEXT,
  "createdById"          UUID NOT NULL,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "deletedAt"            TIMESTAMPTZ,

  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_courseGroupId_fkey"
  FOREIGN KEY ("courseGroupId") REFERENCES "course_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "enrollments"
  ADD CONSTRAINT "enrollments_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "enrollments_studentId_idx"      ON "enrollments"("studentId");
CREATE INDEX "enrollments_courseId_idx"       ON "enrollments"("courseId");
CREATE INDEX "enrollments_courseGroupId_idx"  ON "enrollments"("courseGroupId");
CREATE INDEX "enrollments_status_idx"         ON "enrollments"("status");
CREATE INDEX "enrollments_enrollmentDate_idx" ON "enrollments"("enrollmentDate");
CREATE INDEX "enrollments_deletedAt_idx"      ON "enrollments"("deletedAt");

-- ── payments ─────────────────────────────────────────────────────────────────

CREATE TABLE "payments" (
  "id"                   UUID NOT NULL DEFAULT gen_random_uuid(),
  "enrollmentId"         UUID NOT NULL,
  "studentId"            UUID NOT NULL,
  "totalAmountToman"     INTEGER NOT NULL,
  "paidAmountToman"      INTEGER NOT NULL DEFAULT 0,
  "remainingAmountToman" INTEGER NOT NULL,
  "status"               "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  "notes"                TEXT,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_enrollmentId_key" UNIQUE ("enrollmentId");

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "payments_studentId_idx" ON "payments"("studentId");
CREATE INDEX "payments_status_idx"    ON "payments"("status");

-- ── payment_transactions ─────────────────────────────────────────────────────

CREATE TABLE "payment_transactions" (
  "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentId"     UUID NOT NULL,
  "amountToman"   INTEGER NOT NULL,
  "method"        "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "paidAt"        TIMESTAMPTZ NOT NULL,
  "receiptNote"   VARCHAR(500),
  "recordedById"  UUID NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payment_transactions"
  ADD CONSTRAINT "payment_transactions_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "payment_transactions_paymentId_idx"    ON "payment_transactions"("paymentId");
CREATE INDEX "payment_transactions_paidAt_idx"       ON "payment_transactions"("paidAt");
CREATE INDEX "payment_transactions_recordedById_idx" ON "payment_transactions"("recordedById");

-- ── installments ─────────────────────────────────────────────────────────────

CREATE TABLE "installments" (
  "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentId"           UUID NOT NULL,
  "studentId"           UUID NOT NULL,
  "installmentNumber"   INTEGER NOT NULL,
  "amountToman"         INTEGER NOT NULL,
  "dueDate"             TIMESTAMPTZ NOT NULL,
  "paidAt"              TIMESTAMPTZ,
  "status"              "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
  "notes"               VARCHAR(500),
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "installments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "installments_paymentId_installmentNumber_key" UNIQUE ("paymentId", "installmentNumber")
);

ALTER TABLE "installments"
  ADD CONSTRAINT "installments_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "installments_paymentId_idx"       ON "installments"("paymentId");
CREATE INDEX "installments_studentId_idx"       ON "installments"("studentId");
CREATE INDEX "installments_dueDate_idx"         ON "installments"("dueDate");
CREATE INDEX "installments_status_idx"          ON "installments"("status");
CREATE INDEX "installments_status_dueDate_idx"  ON "installments"("status", "dueDate");
