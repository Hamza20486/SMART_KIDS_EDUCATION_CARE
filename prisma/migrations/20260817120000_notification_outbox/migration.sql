-- Phase 11: durable notification outbox and channel delivery tracking.

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'WEB_PUSH');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('QUEUED', 'PROCESSING', 'RETRYING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED');
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');

-- Preserve existing in-app notifications and give each legacy row an idempotency key.
ALTER TABLE "Notification" ADD COLUMN "eventKey" TEXT;
UPDATE "Notification" SET "eventKey" = 'legacy:' || "id";
ALTER TABLE "Notification" ALTER COLUMN "eventKey" SET NOT NULL;

CREATE UNIQUE INDEX "Notification_organizationId_id_key"
  ON "Notification"("organizationId", "id");
CREATE UNIQUE INDEX "Notification_organizationId_userId_eventKey_key"
  ON "Notification"("organizationId", "userId", "eventKey");
DROP INDEX "Notification_organizationId_userId_readAt_idx";
CREATE INDEX "Notification_organizationId_userId_readAt_createdAt_idx"
  ON "Notification"("organizationId", "userId", "readAt", "createdAt");

-- User ownership is now protected by the tenant identifier at the database layer.
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_organizationId_userId_fkey"
  FOREIGN KEY ("organizationId", "userId")
  REFERENCES "User"("organizationId", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationDelivery_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationDelivery_organizationId_notificationId_fkey"
    FOREIGN KEY ("organizationId", "notificationId")
    REFERENCES "Notification"("organizationId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key"
  ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_availableAt_idx"
  ON "NotificationDelivery"("status", "availableAt");
CREATE INDEX "NotificationDelivery_organizationId_status_createdAt_idx"
  ON "NotificationDelivery"("organizationId", "status", "createdAt");

-- Existing rows were already delivered through the in-app channel.
INSERT INTO "NotificationDelivery" (
  "id", "organizationId", "notificationId", "channel", "status",
  "attempts", "maxAttempts", "availableAt", "queuedAt", "sentAt",
  "deliveredAt", "createdAt", "updatedAt"
)
SELECT
  "id" || ':in-app', "organizationId", "id", 'IN_APP', 'DELIVERED',
  1, 5, "createdAt", "createdAt", "createdAt", "createdAt", "createdAt", "createdAt"
FROM "Notification";

CREATE TABLE "NotificationPreference" (
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "NotificationPreference_pkey"
    PRIMARY KEY ("organizationId", "userId", "type"),
  CONSTRAINT "NotificationPreference_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NotificationPreference_organizationId_userId_fkey"
    FOREIGN KEY ("organizationId", "userId")
    REFERENCES "User"("organizationId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "NotificationPreference_organizationId_userId_idx"
  ON "NotificationPreference"("organizationId", "userId");

CREATE TABLE "OutboxEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "aggregateType" TEXT NOT NULL,
  "aggregateId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OutboxEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OutboxEvent_eventKey_key" ON "OutboxEvent"("eventKey");
CREATE INDEX "OutboxEvent_status_availableAt_idx"
  ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_organizationId_aggregateType_aggregateId_idx"
  ON "OutboxEvent"("organizationId", "aggregateType", "aggregateId");
