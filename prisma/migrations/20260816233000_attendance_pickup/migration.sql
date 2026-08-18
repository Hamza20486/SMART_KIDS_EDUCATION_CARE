CREATE UNIQUE INDEX "Attendance_organizationId_id_key" ON "Attendance"("organizationId", "id");

CREATE TABLE "AuthorizedPickupPerson" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "parentId" TEXT,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "phone" TEXT,
  "idLastFour" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorizedPickupPerson_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthorizedPickupPerson_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuthorizedPickupPerson_child_fkey" FOREIGN KEY ("organizationId", "childId") REFERENCES "Child"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuthorizedPickupPerson_parent_fkey" FOREIGN KEY ("organizationId", "parentId") REFERENCES "Parent"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AuthorizedPickupPerson_creator_fkey" FOREIGN KEY ("organizationId", "createdById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AuthorizedPickupPerson_organizationId_id_key" ON "AuthorizedPickupPerson"("organizationId", "id");
CREATE INDEX "AuthorizedPickupPerson_organizationId_childId_active_idx" ON "AuthorizedPickupPerson"("organizationId", "childId", "active");

ALTER TABLE "Attendance" ADD COLUMN "pickupAuthorizationId" TEXT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_pickupAuthorization_fkey" FOREIGN KEY ("organizationId", "pickupAuthorizationId") REFERENCES "AuthorizedPickupPerson"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "AttendanceCorrection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "attendanceId" TEXT NOT NULL,
  "requestedById" TEXT NOT NULL,
  "approvedById" TEXT,
  "beforeData" JSONB NOT NULL,
  "proposedData" JSONB NOT NULL,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AttendanceCorrection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrection_attendance_fkey" FOREIGN KEY ("organizationId", "attendanceId") REFERENCES "Attendance"("organizationId", "id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrection_requester_fkey" FOREIGN KEY ("organizationId", "requestedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrection_approver_fkey" FOREIGN KEY ("organizationId", "approvedById") REFERENCES "User"("organizationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "AttendanceCorrection_organizationId_status_createdAt_idx" ON "AttendanceCorrection"("organizationId", "status", "createdAt");
