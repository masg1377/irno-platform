-- Phase 7: Notifications Foundation
-- Creates notification enums and tables

-- 1. Enums
CREATE TYPE "NotificationType" AS ENUM ('TRANSACTIONAL', 'MARKETING', 'REMINDER', 'SYSTEM');
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'SMS', 'EMAIL', 'TELEGRAM');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ', 'CANCELLED');
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- 2. notifications
CREATE TABLE "notifications" (
    "id"                UUID NOT NULL,
    "recipientUserId"   UUID NOT NULL,
    "title"             TEXT NOT NULL,
    "body"              TEXT NOT NULL,
    "type"              "NotificationType" NOT NULL,
    "channel"           "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status"            "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "priority"          "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "relatedEntityType" TEXT,
    "relatedEntityId"   TEXT,
    "metadata"          JSONB,
    "readAt"            TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "notifications_recipientUserId_idx" ON "notifications"("recipientUserId");
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
CREATE INDEX "notifications_channel_idx" ON "notifications"("channel");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");
CREATE INDEX "notifications_readAt_idx" ON "notifications"("readAt");
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX "notifications_relatedEntity_idx" ON "notifications"("relatedEntityType", "relatedEntityId");

-- 3. notification_templates
CREATE TABLE "notification_templates" (
    "id"        UUID NOT NULL,
    "key"       TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "channel"   "NotificationChannel" NOT NULL,
    "isActive"  BOOLEAN NOT NULL DEFAULT true,
    "variables" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_templates_key_key" ON "notification_templates"("key");
CREATE INDEX "notification_templates_key_idx" ON "notification_templates"("key");
CREATE INDEX "notification_templates_type_idx" ON "notification_templates"("type");
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates"("channel");
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");
CREATE INDEX "notification_templates_deletedAt_idx" ON "notification_templates"("deletedAt");

-- 4. notification_deliveries
CREATE TABLE "notification_deliveries" (
    "id"                UUID NOT NULL,
    "notificationId"    UUID NOT NULL,
    "channel"           "NotificationChannel" NOT NULL,
    "status"            "NotificationStatus" NOT NULL,
    "provider"          TEXT,
    "providerMessageId" TEXT,
    "errorMessage"      TEXT,
    "sentAt"            TIMESTAMP(3),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");
CREATE INDEX "notification_deliveries_channel_idx" ON "notification_deliveries"("channel");
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");
CREATE INDEX "notification_deliveries_createdAt_idx" ON "notification_deliveries"("createdAt");

-- 5. notification_preferences
CREATE TABLE "notification_preferences" (
    "id"                      UUID NOT NULL,
    "userId"                  UUID NOT NULL,
    "inAppEnabled"            BOOLEAN NOT NULL DEFAULT true,
    "smsTransactionalEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsMarketingEnabled"     BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled"            BOOLEAN NOT NULL DEFAULT false,
    "telegramEnabled"         BOOLEAN NOT NULL DEFAULT false,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");
CREATE INDEX "notification_preferences_userId_idx" ON "notification_preferences"("userId");
