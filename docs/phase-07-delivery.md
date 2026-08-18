# Phase 7 Delivery — Homework Workflows

## Homework lifecycle

- Search and pagination
- Detail page
- Draft and Published states
- Edit, archive and reactivate
- Publication timestamp
- Teacher-class scope enforcement
- Immediate parent notification on first publication
- Durable due-date reminder scheduled for 24 hours before deadline

## Attachments

- Teacher homework attachments
- Parent submission attachments
- PDF, JPEG, PNG and WebP only
- 10 MB input limit
- Images sanitized and converted to WebP
- PDF magic-byte validation
- Malware scan adapter
- SHA-256 checksum and safe filename
- Private R2 storage and signed/protected downloads
- Plan storage quota enforcement
- Secure deletion

## Per-child assignments

- Default class-wide assignment when no explicit rows exist
- Explicit child assignments for exceptions
- Child must be active and in the homework class
- Tenant and teacher-class checks

## Parent submissions

- Linked children only
- Published, active homework only
- Optional parent comment and attachment
- Submitted or Late state based on due date
- Resubmission increments version
- Previous feedback/reviewer cleared on resubmission
- Previous private object deleted after successful replacement

## Teacher review

- Assigned classes only
- Reviewed or Returned status
- Required teacher feedback
- Reviewer and timestamp
- Parent in-app notification
- Submission attachment download authorization
- Audit records

## Inngest

- `/api/inngest` serve endpoint
- `homework/published` event
- Durable sleep until one day before due date
- Idempotent lookup of active/published homework before sending
- Parent notification fan-out based on assignment scope
- Three retries

## Remaining verification

- Inngest cloud registration and signing-key verification
- R2 submission attachment integration test
- PostgreSQL resubmission/concurrency tests
- Playwright publish → submit → return → resubmit → review workflow
- Email/push delivery for homework events in a later notification phase
