ALTER TABLE "Activity"
  ADD COLUMN "visibleToParents" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "Activity_organizationId_id_key" ON "Activity"("organizationId", "id");
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_classId_fkey";
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_childId_fkey";
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_createdById_fkey";
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_class_fkey" FOREIGN KEY ("organizationId", "classId") REFERENCES "ClassRoom"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_creator_fkey" FOREIGN KEY ("organizationId", "createdById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ActivityMedia"
  ADD COLUMN "checksumSha256" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "scanStatus" TEXT NOT NULL DEFAULT 'CLEAN',
  ADD COLUMN "uploadedById" TEXT,
  ADD COLUMN "deletedAt" TIMESTAMP(3);
UPDATE "ActivityMedia" m SET "uploadedById" = a."createdById" FROM "Activity" a WHERE a."id" = m."activityId";
ALTER TABLE "ActivityMedia" ALTER COLUMN "uploadedById" SET NOT NULL;
ALTER TABLE "ActivityMedia" DROP CONSTRAINT "ActivityMedia_activityId_fkey";
DROP INDEX "ActivityMedia_organizationId_activityId_idx";
ALTER TABLE "ActivityMedia" ADD CONSTRAINT "ActivityMedia_activity_fkey" FOREIGN KEY ("organizationId", "activityId") REFERENCES "Activity"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityMedia" ADD CONSTRAINT "ActivityMedia_uploader_fkey" FOREIGN KEY ("organizationId", "uploadedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "ActivityMedia_organizationId_activityId_deletedAt_idx" ON "ActivityMedia"("organizationId", "activityId", "deletedAt");

CREATE TABLE "MediaConsent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "parentId" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'ACTIVITY_MEDIA',
  "status" TEXT NOT NULL DEFAULT 'GRANTED',
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaConsent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaConsent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaConsent_parent_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "Parent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MediaConsent_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MediaConsent_organizationId_parentId_childId_scope_key" ON "MediaConsent"("organizationId", "parentId", "childId", "scope");
CREATE INDEX "MediaConsent_organizationId_childId_status_idx" ON "MediaConsent"("organizationId", "childId", "status");
