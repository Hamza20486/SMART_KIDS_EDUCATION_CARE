# Phase 11 Delivery — Durable Notifications and Background Jobs

## Delivered

- Transactional PostgreSQL outbox for business notification events
- Idempotent per-recipient notification materialization
- Tenant-compound notification/user foreign key
- In-app and email delivery channels
- Delivery states: queued, processing, retrying, sent, delivered, failed and cancelled
- Exponential retry with a capped delay
- Stale worker-lock recovery
- Inngest immediate dispatch plus one-minute recovery sweep
- Per-user in-app/email preferences
- Non-disableable account-security notifications
- Parent and staff notification center
- Organization-scoped delivery health dashboard
- Audited manual retry for exhausted deliveries and outbox events
- Payment due/overdue scheduled jobs
- Existing homework, absence and complaint delayed jobs migrated to the durable notification pipeline

## Event coverage

- Attendance status changes
- Arrival and departure
- Parent-visible activity publication
- Homework publication, due reminder and review
- Absence submission, decision and start
- Complaint creation, replies, updates and SLA escalation
- Payment due, overdue and recorded
- Receipt issuance/reissuance
- Announcements
- Account lockout, password change and password reset

## Data model

- `OutboxEvent` is written in the same transaction as the business mutation.
- `Notification` is idempotent by organization, recipient and event key.
- `NotificationDelivery` tracks each channel independently.
- `NotificationPreference` stores user choices by event type.
- Existing notifications are migrated as delivered in-app records.

## Reliability behavior

Immediate Inngest dispatch is an optimization. If sending the wake-up event fails, the durable outbox remains authoritative and the scheduled sweep processes it later. Workers claim records atomically, recover abandoned locks and never create a second notification for the same event/recipient.

## Required production configuration

```env
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."
RESEND_API_KEY="..."
EMAIL_FROM="Smart Kids <no-reply@verified-domain.ma>"
```

Inngest reads and verifies its signing key through the SDK environment configuration. Resend must use a verified sending domain.

## Verification

- Unit tests cover recipient deduplication, preferences, critical notifications and retry delays.
- The optional PostgreSQL integration test proves tenant filtering and repeated-event idempotency.
- Run all database tests with an isolated migrated `TEST_DATABASE_URL`.

## Remaining production verification

- Apply the migration to isolated PostgreSQL development and test databases.
- Run the outbox integration test against PostgreSQL.
- Verify Inngest signing, retries and schedules in staging.
- Verify Resend provider IDs and delivery behavior in staging.
- Add Resend webhook processing if delivered/bounced status is required.
- Add Web Push only as a separately approved later enhancement.
