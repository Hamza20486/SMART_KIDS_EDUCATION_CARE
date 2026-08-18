# Phase 8 Delivery — Absence Requests

## Parent workflow

- Select linked active child
- Start/end dates and reason
- Optional secure PDF/image justification
- Maximum 90-day request
- Prevent overlapping Pending/Approved requests
- Track request and attachment
- Cancel Pending requests only
- View staff decision and notifications

## Staff workflow

- Status filter and tenant/teacher-class scope
- Detail page
- Secure attachment download
- Approve or reject with review note
- Reviewer and timestamp
- Audit history
- Calendar month view

## Attendance synchronization

Approval transactionally upserts an `EXCUSED` attendance record for every day in the approved range. Each record keeps the reviewing staff user and absence reason. The request records `attendanceSyncedAt`.

## Notifications and follow-up

- Immediate parent notification after decision
- Inngest `absence/approved` event
- Durable wait until absence start
- Start-day parent reminder
- Retry policy

## Security and integrity

- Parent-child relationship required
- Teacher sees only assigned classes
- Only Manager/Admin can review
- Attachments use private R2, malware scanning, safe names, checksums and plan quotas
- PostgreSQL `btree_gist` exclusion constraint prevents concurrent overlapping active requests
- Cancelled/Rejected requests no longer block a future range

## New database entity

- `AbsenceAttachment`

## Remaining verification

- Apply/test `btree_gist` on isolated Neon branch
- PostgreSQL transaction rollback test for multi-day attendance sync
- R2 attachment integration test
- Playwright submit/cancel/approve/reject/calendar test
- Decide school-specific weekend/holiday synchronization rules
