ALTER TABLE "Homework"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "Homework_organizationId_id_key" ON "Homework"("organizationId", "id");
ALTER TABLE "Homework" DROP CONSTRAINT "Homework_classId_fkey";
ALTER TABLE "Homework" DROP CONSTRAINT "Homework_createdById_fkey";
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_class_fkey" FOREIGN KEY ("organizationId", "classId") REFERENCES "ClassRoom"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_creator_fkey" FOREIGN KEY ("organizationId", "createdById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "HomeworkAttachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeworkAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HomeworkAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HomeworkAttachment_homework_fkey" FOREIGN KEY ("organizationId", "homeworkId") REFERENCES "Homework"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HomeworkAttachment_uploader_fkey" FOREIGN KEY ("organizationId", "uploadedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HomeworkAttachment_organizationId_homeworkId_deletedAt_idx" ON "HomeworkAttachment"("organizationId", "homeworkId", "deletedAt");

CREATE TABLE "HomeworkAssignment" (
  "organizationId" TEXT NOT NULL,
  "homeworkId" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HomeworkAssignment_pkey" PRIMARY KEY ("homeworkId", "childId"),
  CONSTRAINT "HomeworkAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HomeworkAssignment_homework_fkey" FOREIGN KEY ("organizationId", "homeworkId") REFERENCES "Homework"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HomeworkAssignment_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "HomeworkAssignment_organizationId_childId_idx" ON "HomeworkAssignment"("organizationId", "childId");

ALTER TABLE "HomeworkSubmission"
  ADD COLUMN "attachmentName" TEXT,
  ADD COLUMN "attachmentMime" TEXT,
  ADD COLUMN "attachmentSize" INTEGER,
  ADD COLUMN "attachmentHash" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "teacherFeedback" TEXT,
  ADD COLUMN "reviewedById" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "HomeworkSubmission" DROP CONSTRAINT "HomeworkSubmission_homeworkId_fkey";
ALTER TABLE "HomeworkSubmission" DROP CONSTRAINT "HomeworkSubmission_childId_fkey";
DROP INDEX "HomeworkSubmission_organizationId_idx";
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homework_fkey" FOREIGN KEY ("organizationId", "homeworkId") REFERENCES "Homework"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_reviewer_fkey" FOREIGN KEY ("organizationId", "reviewedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "HomeworkSubmission_organizationId_status_idx" ON "HomeworkSubmission"("organizationId", "status");
