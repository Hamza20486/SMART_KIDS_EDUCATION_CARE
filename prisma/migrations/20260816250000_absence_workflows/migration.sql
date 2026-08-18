ALTER TABLE "AbsenceRequest"
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "attendanceSyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "AbsenceRequest_organizationId_id_key" ON "AbsenceRequest"("organizationId", "id");
CREATE INDEX "AbsenceRequest_organizationId_childId_startDate_endDate_idx" ON "AbsenceRequest"("organizationId", "childId", "startDate", "endDate");
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_no_active_overlap" EXCLUDE USING gist (
  "organizationId" WITH =,
  "childId" WITH =,
  tsrange("startDate", "endDate", '[]') WITH &&
) WHERE ("status" IN ('PENDING', 'APPROVED'));
ALTER TABLE "AbsenceRequest" DROP CONSTRAINT "AbsenceRequest_parentId_fkey";
ALTER TABLE "AbsenceRequest" DROP CONSTRAINT "AbsenceRequest_childId_fkey";
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_parent_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "Parent"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AbsenceRequest" ADD CONSTRAINT "AbsenceRequest_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "AbsenceAttachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "absenceRequestId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AbsenceAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AbsenceAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AbsenceAttachment_request_fkey" FOREIGN KEY ("organizationId", "absenceRequestId") REFERENCES "AbsenceRequest"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AbsenceAttachment_uploader_fkey" FOREIGN KEY ("organizationId", "uploadedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AbsenceAttachment_organizationId_absenceRequestId_deletedAt_idx" ON "AbsenceAttachment"("organizationId", "absenceRequestId", "deletedAt");
