ALTER TABLE "Complaint"
  ADD COLUMN "reference" TEXT,
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "closedAt" TIMESTAMP(3);
UPDATE "Complaint" SET "reference" = 'CMP-' || UPPER(SUBSTRING("id" FROM 1 FOR 8)), "slaDueAt" = "createdAt" + INTERVAL '3 days';
ALTER TABLE "Complaint" ALTER COLUMN "reference" SET NOT NULL;
ALTER TABLE "Complaint" ALTER COLUMN "slaDueAt" SET NOT NULL;
CREATE UNIQUE INDEX "Complaint_organizationId_id_key" ON "Complaint"("organizationId", "id");
CREATE UNIQUE INDEX "Complaint_organizationId_reference_key" ON "Complaint"("organizationId", "reference");
CREATE INDEX "Complaint_organizationId_slaDueAt_idx" ON "Complaint"("organizationId", "slaDueAt");

ALTER TABLE "ComplaintMessage" ADD COLUMN "editedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "ComplaintMessage_organizationId_id_key" ON "ComplaintMessage"("organizationId", "id");
ALTER TABLE "ComplaintMessage" DROP CONSTRAINT "ComplaintMessage_complaintId_fkey";
ALTER TABLE "ComplaintMessage" DROP CONSTRAINT "ComplaintMessage_senderId_fkey";
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_complaint_fkey" FOREIGN KEY ("organizationId", "complaintId") REFERENCES "Complaint"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComplaintMessage" ADD CONSTRAINT "ComplaintMessage_sender_fkey" FOREIGN KEY ("organizationId", "senderId") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ComplaintAttachment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "complaintId" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "checksumSha256" TEXT NOT NULL,
  "uploadedById" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ComplaintAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ComplaintAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComplaintAttachment_complaint_fkey" FOREIGN KEY ("organizationId", "complaintId") REFERENCES "Complaint"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComplaintAttachment_message_fkey" FOREIGN KEY ("organizationId", "messageId") REFERENCES "ComplaintMessage"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ComplaintAttachment_uploader_fkey" FOREIGN KEY ("organizationId", "uploadedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ComplaintAttachment_organizationId_complaintId_messageId_deletedAt_idx" ON "ComplaintAttachment"("organizationId", "complaintId", "messageId", "deletedAt");
