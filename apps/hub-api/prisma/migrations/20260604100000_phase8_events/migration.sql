-- Phase 8: Irno Events Module
-- Creates event enums and tables: events, event_registrations,
-- event_payment_transactions, event_eligibility_rules, event_reminders

-- 1. Enums
CREATE TYPE "EventType" AS ENUM (
  'WEBINAR', 'CONFERENCE', 'FREE_DISCUSSION', 'WORKSHOP',
  'GROUP_CONSULTATION', 'OPEN_SESSION', 'CHALLENGE', 'OTHER'
);

CREATE TYPE "EventDeliveryMode" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

CREATE TYPE "EventRegistrationMode" AS ENUM ('FREE', 'PAID', 'INVITE_ONLY', 'INTERNAL_ONLY');

CREATE TYPE "EventStatus" AS ENUM (
  'DRAFT', 'PUBLISHED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED',
  'LIVE', 'COMPLETED', 'CANCELLED'
);

CREATE TYPE "EventRegistrationStatus" AS ENUM (
  'PENDING', 'APPROVED', 'WAITLISTED', 'REJECTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'
);

CREATE TYPE "EventRegistrationPaymentStatus" AS ENUM (
  'NOT_REQUIRED', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED'
);

CREATE TYPE "EventEligibilityRuleType" AS ENUM (
  'ACTIVE_STUDENT_ONLY', 'SPECIFIC_COURSE', 'SPECIFIC_COURSE_GROUP',
  'COMPLETED_COURSE', 'NO_OVERDUE_PAYMENTS', 'STAFF_ONLY',
  'PUBLIC', 'MANUAL_APPROVAL_REQUIRED', 'SKILL_OR_CREDIT_PLACEHOLDER'
);

CREATE TYPE "EventReminderType" AS ENUM (
  'REGISTRATION_CONFIRMATION', 'BEFORE_24_HOURS', 'BEFORE_1_HOUR',
  'EVENT_STARTED', 'EVENT_CANCELLED'
);

CREATE TYPE "EventReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- 2. events
CREATE TABLE "events" (
    "id"                   UUID NOT NULL,
    "title"                VARCHAR(300) NOT NULL,
    "slug"                 VARCHAR(150) NOT NULL,
    "description"          TEXT,
    "type"                 "EventType" NOT NULL,
    "deliveryMode"         "EventDeliveryMode" NOT NULL,
    "registrationMode"     "EventRegistrationMode" NOT NULL,
    "status"               "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt"             TIMESTAMPTZ NOT NULL,
    "endsAt"               TIMESTAMPTZ,
    "location"             VARCHAR(500),
    "onlineUrl"            VARCHAR(500),
    "meetinoMeetingId"     VARCHAR(100),
    "meetinoJoinUrl"       VARCHAR(500),
    "capacity"             INTEGER,
    "priceToman"           INTEGER NOT NULL DEFAULT 0,
    "registrationDeadline" TIMESTAMPTZ,
    "createdById"          UUID NOT NULL,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt"            TIMESTAMPTZ,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "events_slug_key" ON "events"("slug");
CREATE INDEX "events_type_idx" ON "events"("type");
CREATE INDEX "events_deliveryMode_idx" ON "events"("deliveryMode");
CREATE INDEX "events_registrationMode_idx" ON "events"("registrationMode");
CREATE INDEX "events_status_idx" ON "events"("status");
CREATE INDEX "events_startsAt_idx" ON "events"("startsAt");
CREATE INDEX "events_deletedAt_idx" ON "events"("deletedAt");

ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. event_registrations
CREATE TABLE "event_registrations" (
    "id"                   UUID NOT NULL,
    "eventId"              UUID NOT NULL,
    "userId"               UUID,
    "studentId"            UUID,
    "applicantId"          UUID,
    "fullName"             VARCHAR(200) NOT NULL,
    "mobile"               VARCHAR(20) NOT NULL,
    "email"                VARCHAR(255),
    "status"               "EventRegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus"        "EventRegistrationPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "amountDueToman"       INTEGER NOT NULL DEFAULT 0,
    "paidAmountToman"      INTEGER NOT NULL DEFAULT 0,
    "remainingAmountToman" INTEGER NOT NULL DEFAULT 0,
    "registeredAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "checkedInAt"          TIMESTAMPTZ,
    "cancelledAt"          TIMESTAMPTZ,
    "notes"                TEXT,
    "createdById"          UUID,
    "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deletedAt"            TIMESTAMPTZ,

    CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_registrations_eventId_idx" ON "event_registrations"("eventId");
CREATE INDEX "event_registrations_userId_idx" ON "event_registrations"("userId");
CREATE INDEX "event_registrations_studentId_idx" ON "event_registrations"("studentId");
CREATE INDEX "event_registrations_applicantId_idx" ON "event_registrations"("applicantId");
CREATE INDEX "event_registrations_mobile_idx" ON "event_registrations"("mobile");
CREATE INDEX "event_registrations_status_idx" ON "event_registrations"("status");
CREATE INDEX "event_registrations_paymentStatus_idx" ON "event_registrations"("paymentStatus");
CREATE INDEX "event_registrations_registeredAt_idx" ON "event_registrations"("registeredAt");
CREATE INDEX "event_registrations_deletedAt_idx" ON "event_registrations"("deletedAt");

ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_applicantId_fkey"
    FOREIGN KEY ("applicantId") REFERENCES "applicants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. event_payment_transactions
CREATE TABLE "event_payment_transactions" (
    "id"                  UUID NOT NULL,
    "eventRegistrationId" UUID NOT NULL,
    "amountToman"         INTEGER NOT NULL,
    "method"              "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt"              TIMESTAMPTZ NOT NULL,
    "receiptNote"         VARCHAR(500),
    "recordedById"        UUID NOT NULL,
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "event_payment_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_payment_transactions_eventRegistrationId_idx" ON "event_payment_transactions"("eventRegistrationId");
CREATE INDEX "event_payment_transactions_paidAt_idx" ON "event_payment_transactions"("paidAt");
CREATE INDEX "event_payment_transactions_recordedById_idx" ON "event_payment_transactions"("recordedById");

ALTER TABLE "event_payment_transactions" ADD CONSTRAINT "event_payment_transactions_eventRegistrationId_fkey"
    FOREIGN KEY ("eventRegistrationId") REFERENCES "event_registrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_payment_transactions" ADD CONSTRAINT "event_payment_transactions_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 5. event_eligibility_rules
CREATE TABLE "event_eligibility_rules" (
    "id"         UUID NOT NULL,
    "eventId"    UUID NOT NULL,
    "type"       "EventEligibilityRuleType" NOT NULL,
    "operator"   VARCHAR(50),
    "value"      JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "event_eligibility_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_eligibility_rules_eventId_idx" ON "event_eligibility_rules"("eventId");
CREATE INDEX "event_eligibility_rules_type_idx" ON "event_eligibility_rules"("type");

ALTER TABLE "event_eligibility_rules" ADD CONSTRAINT "event_eligibility_rules_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. event_reminders
CREATE TABLE "event_reminders" (
    "id"                     UUID NOT NULL,
    "eventId"                UUID NOT NULL,
    "type"                   "EventReminderType" NOT NULL,
    "scheduledAt"            TIMESTAMPTZ NOT NULL,
    "channel"                "NotificationChannel" NOT NULL,
    "status"                 "EventReminderStatus" NOT NULL DEFAULT 'PENDING',
    "notificationTemplateId" UUID,
    "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "event_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_reminders_eventId_idx" ON "event_reminders"("eventId");
CREATE INDEX "event_reminders_scheduledAt_idx" ON "event_reminders"("scheduledAt");
CREATE INDEX "event_reminders_status_idx" ON "event_reminders"("status");

ALTER TABLE "event_reminders" ADD CONSTRAINT "event_reminders_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (moved from 20260604015450_phase_8 — must run after tables are created)
ALTER TABLE "events" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "event_eligibility_rules" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "event_registrations" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "event_reminders" ALTER COLUMN "updatedAt" DROP DEFAULT;
