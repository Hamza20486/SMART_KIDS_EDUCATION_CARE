# Phase 9 Delivery — Complaints and Secure Messaging

## Complaint lifecycle

- Non-identifying organization-unique reference
- Search by reference or subject
- Status and priority filters
- Detail page for staff and parent
- Status transition validation
- Open, In Progress, Resolved and Closed lifecycle
- Parent reply reopens a Resolved complaint
- Closed complaints reject new messages
- Resolution and closure timestamps

## Conversation

- Threaded chronological messages
- Parent/staff replies
- Staff-only internal notes
- Parent API and page exclude internal messages at query level
- Defense-in-depth internal-message unit test
- Sender name/role and timestamps
- Parent/staff notifications

## Assignment and priority

- Assignment to active Admin or Manager
- LOW, NORMAL, HIGH and URGENT priorities
- Separate assign/respond/internal-note permissions
- Invalid assignees rejected server-side

## SLA

- LOW: 7 days
- NORMAL: 3 days
- HIGH: 24 hours
- URGENT: 4 hours
- Inngest durable escalation at the active SLA deadline
- Stale escalation events ignored after priority/SLA change
- Assigned staff notified; otherwise active Admin/Manager users
- Escalation audit event

## Secure attachments

- PDF/JPEG/PNG/WebP, maximum 10 MB
- Image sanitization and WebP conversion
- PDF signature validation
- Malware scanning
- Private R2 storage
- Safe names and SHA-256 checksums
- Plan storage quota
- Parent cannot access an internal-note attachment
- Signed/protected download

## Audit

- Creation
- Public reply
- Internal note
- Assignment
- Priority/status update
- SLA escalation

## Remaining verification

- PostgreSQL thread/attachment integration tests
- R2 attachment test
- Inngest SLA timing test
- Playwright parent/staff/internal-note isolation suite
- Organization-specific SLA configuration
