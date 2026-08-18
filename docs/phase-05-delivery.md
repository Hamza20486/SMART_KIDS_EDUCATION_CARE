# Phase 5 Delivery — Attendance and Pickup

## Implemented

### Daily attendance

- Class/date selector
- Teacher assignment scope
- Daily class roster
- Bulk “all present” action
- Per-child Present, Absent, Late and Excused status
- Per-child note
- Atomic bulk save with a single audit event
- Maximum 100 entries per bulk request

### Arrival and departure

- Arrival timestamp
- Departure timestamp
- Departure requires an active authorized pickup person
- Pickup authorization must belong to the same organization and child
- Pickup name snapshot retained on Attendance
- Staff actor and timestamp audited

### Authorized pickup people

- Create from child detail
- Optional link to an existing parent with `canPickup=true`
- Phone and last four identity-document digits
- Soft deactivation
- Visible to linked parents
- Tenant-safe API

### Corrections

- Teacher/admin/manager correction request
- Required correction reason
- Before and proposed values stored as JSON audit evidence
- Teacher cannot approve their own or other corrections
- Manager/admin approve or reject
- Attendance changes apply only after approval
- Review actor, timestamp and note fields
- Correction history interface

### Parent visibility

- Attendance status
- Arrival time
- Departure time
- Pickup-person snapshot
- Current authorized pickup list

### Export

- Tenant/teacher-scoped CSV
- Date and optional class filters
- 10,000-row safety limit
- UTF-8 BOM for Excel
- CSV formula-injection protection
- Private no-store response headers

## New models

- `AuthorizedPickupPerson`
- `AttendanceCorrection`

## New routes

- `/admin/attendance/daily`
- `/admin/attendance/corrections`
- `/api/attendance/daily`
- `/api/attendance/times`
- `/api/attendance/corrections`
- `/api/attendance/export`
- `/api/pickup-authorizations`

## Remaining production verification

- PostgreSQL transaction tests for bulk save and correction approval
- Playwright class-grid workflow
- Concurrency test for simultaneous attendance saves
- School-specific pickup identity procedures and staff training
