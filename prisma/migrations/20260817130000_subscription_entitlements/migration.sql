-- Phase 12: typed SaaS entitlements, lifecycle timestamps and audited changes.

ALTER TABLE "Subscription"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Subscription_organizationId_id_key"
  ON "Subscription"("organizationId", "id");

CREATE TABLE "SubscriptionEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "fromPlanCode" TEXT,
  "toPlanCode" TEXT,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubscriptionEvent_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionEvent_organizationId_subscriptionId_fkey"
    FOREIGN KEY ("organizationId", "subscriptionId")
    REFERENCES "Subscription"("organizationId", "id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SubscriptionEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "SubscriptionEvent_organizationId_createdAt_idx"
  ON "SubscriptionEvent"("organizationId", "createdAt");
CREATE INDEX "SubscriptionEvent_subscriptionId_createdAt_idx"
  ON "SubscriptionEvent"("subscriptionId", "createdAt");

-- Normalize the three product plans to the Phase 12 entitlement contract.
UPDATE "SubscriptionPlan"
SET "features" = '{
  "maxChildren": 100,
  "maxStaff": 10,
  "storageMb": 100,
  "activityMedia": false,
  "homework": false,
  "advancedCommunication": false,
  "basicReports": true,
  "advancedReports": false
}'::jsonb
WHERE "code" = 'ESSENTIAL';

UPDATE "SubscriptionPlan"
SET "features" = '{
  "maxChildren": 300,
  "maxStaff": 30,
  "storageMb": 2048,
  "activityMedia": true,
  "homework": true,
  "advancedCommunication": true,
  "basicReports": true,
  "advancedReports": false
}'::jsonb
WHERE "code" = 'PRO';

UPDATE "SubscriptionPlan"
SET "features" = '{
  "maxChildren": 1000,
  "maxStaff": 100,
  "storageMb": 10240,
  "activityMedia": true,
  "homework": true,
  "advancedCommunication": true,
  "basicReports": true,
  "advancedReports": true
}'::jsonb
WHERE "code" = 'PREMIUM';
