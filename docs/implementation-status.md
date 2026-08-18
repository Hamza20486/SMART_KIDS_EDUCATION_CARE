# Phased Implementation Status

## Selected production stack

- Vercel: Next.js hosting
- Neon: PostgreSQL
- Upstash Redis: distributed rate limiting
- Cloudflare R2: private files
- Resend: transactional email
- Inngest: durable background workflows
- French-first pilot; Arabic/English follow

## Phase 16 — production infrastructure

- [x] Vercel hosting configuration and production security headers
- [x] Pooled runtime and direct migration PostgreSQL connection contract
- [x] R2, Upstash, Inngest, Resend, malware scanner and Sentry environment validation
- [x] Public liveness and protected dependency-readiness endpoints
- [x] Sentry server/edge/browser error tracking with PII disabled
- [x] Structured redacted JSON logs and request correlation IDs
- [x] Daily logical backup, retention and private R2 upload tooling
- [x] Safeguarded restore, checksum, migration and database/HTTP smoke tooling
- [x] Staging/production deployment and monthly restore-drill workflow templates
- [x] Deployment, backup, rollback, monitoring, secret and incident runbooks
- [ ] Provision user-owned staging and production service projects
- [ ] Install workflow templates with GitHub workflow-management permission
- [ ] Enable and verify managed PostgreSQL PITR
- [ ] Restore a production-format backup into a clean environment and pass smoke/Playwright tests

## Phase 15 — automated testing

- [x] 180 passing unit tests across 38 unit-test files
- [x] Domain, money, timezone, plan-limit and transition coverage
- [x] RBAC, feature-gate, tenant, parent-owner and teacher-class policy tests
- [x] Suspended identity/organization and private-file denial tests
- [x] Enforced critical-module coverage thresholds (92.37% statements, 79.82% branches, 94.01% functions, 94.36% lines)
- [x] 11 PostgreSQL integration tests for filtering, constraints, relationships, rollback, reconciliation, subscriptions and outbox behavior
- [x] 29 Playwright authentication, all-role, parent, attendance, absence, complaint, payment, SaaS, security, Arabic RTL and mobile tests
- [x] Versioned PostgreSQL 16 CI workflow template for migrations, unit, integration and browser suites
- [x] Unit/integration/E2E command separation and safe integration skipping without a test database
- [ ] Install the workflow template using GitHub workflow-management permission
- [ ] Confirm the PostgreSQL and Playwright suites pass in GitHub Actions
- [ ] Add staging adapter tests for R2, Upstash, Resend, malware scanning and Inngest
- [ ] Apply a compatible upstream fix for the Prisma `deepmerge-ts` advisory

## Phase 14 — reports and exports

- [x] Operational attendance, absence, child, teacher, homework, complaint, pickup and class-utilization reports
- [x] Financial billing, collection, revenue, method, outstanding, discount, partial-payment and receipt reports
- [x] Platform plan, trial, expiry, suspension and usage reports
- [x] Inclusive date and class filters with bounded synchronous ranges
- [x] Permission, tenant and class-scoped APIs and pages
- [x] Audited, formula-injection-safe CSV/XLSX/PDF exports
- [x] Print-friendly French, Arabic RTL and English report pages
- [x] Unit tests for range, export safety, aggregation, scope, RBAC and audit behavior
- [ ] PostgreSQL-backed authenticated integration suite
- [ ] Playwright all-role/filter/locale report suite
- [ ] Arabic-capable embedded font and shaping for PDF export
- [ ] Large-tenant performance validation and asynchronous export threshold

## Phase 0 — baseline and audit

- [x] Preserve pre-hardening baseline
- [x] Requirements traceability matrix
- [x] Remove obsolete server-action duplicates
- [x] Existing lint/type/test/build gate
- [ ] Commit in the user's Git repository

## Phase 13 — internationalization

- [x] Locale-prefixed `/fr`, `/ar` and `/en` routing
- [x] French-default cookie and browser-language negotiation
- [x] Typed 403-key translation catalogue in all three languages
- [x] Server and client translation APIs
- [x] Global persistent language switcher
- [x] Arabic RTL document and responsive layout support
- [x] Locale-aware Morocco date and MAD formatting helpers
- [x] Public, authentication, navigation, parent, shared workflow and SaaS administration localization
- [x] Shared form labels, actions, statuses and notification labels
- [x] Translation parity validation and unit tests
- [ ] Native-speaker Arabic and English review
- [ ] Translate remaining dynamic API/email/notification/PDF copy
- [ ] Playwright all-role locale and RTL suite
- [ ] Enforce zero hard-coded dynamic messages in CI

## Phase 12 — SaaS subscriptions and limits

- [x] Typed Essential, Pro and Premium entitlement contract
- [x] Child, staff and storage limits
- [x] Server-side activity media, homework, communication and report feature gates
- [x] Trial and active period expiry enforcement
- [x] Manual trial, activation, renewal, plan-change, past-due, suspension and cancellation lifecycle
- [x] Append-only subscription event history and audit logs
- [x] Super-admin usage, lifecycle and history dashboard
- [x] Daily Inngest lifecycle expiry sweep
- [x] Subscription status notifications to organization administrators
- [x] Unit tests and optional PostgreSQL limit test
- [x] No online payment gateway
- [ ] Apply migrations and run integration tests against isolated PostgreSQL
- [ ] Verify lifecycle jobs and email in staging
- [ ] Playwright subscription lifecycle and feature-denial workflows
- [ ] Final commercial limit approval

## Phase 11 — notifications and background jobs

- [x] Transactional PostgreSQL outbox
- [x] Idempotent per-recipient notification materialization
- [x] In-app and email delivery tracking
- [x] Exponential retry and stale-lock recovery
- [x] Per-user channel preferences
- [x] Critical account-security notifications
- [x] Parent/staff notification center
- [x] Administrator delivery-health and manual-retry interface
- [x] Attendance, activity, homework, absence, complaint, payment, receipt and announcement events
- [x] Inngest immediate dispatch and scheduled recovery sweep
- [x] Payment due and overdue schedules
- [x] Unit tests and optional PostgreSQL outbox isolation test
- [ ] Apply migration and run integration suite against isolated PostgreSQL
- [ ] Verify Inngest and Resend in staging
- [ ] Add provider webhook delivery/bounce reconciliation if required
- [ ] Playwright notification preference and delivery workflows

## Phase 10 — payments and receipts

- [x] Categories, periods, discounts and installment metadata
- [x] Partial/manual payment transactions
- [x] Server-derived reconciliation status
- [x] Sequential organization/year receipt numbering
- [x] Private PDF receipt generation/download
- [x] Void and reissue workflow
- [x] Parent/accountant dashboards
- [x] CSV and XLSX exports
- [x] Inngest overdue automation
- [x] No online payment gateway
- [ ] Neon concurrency test for receipt sequence
- [ ] R2 PDF and Playwright accounting workflows
- [ ] Moroccan accounting/legal review

## Phase 9 — complaints and messaging

- [x] Parent/staff threaded conversation
- [x] Staff-only internal notes with parent exclusion
- [x] Assignment, priority and status transitions
- [x] SLA deadlines and durable escalation
- [x] Secure private attachments
- [x] Parent/staff notifications
- [x] Detail pages, filtering and audit history
- [x] Unit tests for transitions, SLA and internal-note isolation
- [ ] PostgreSQL/R2/Inngest integration tests
- [ ] Playwright complaint isolation workflow
- [ ] Organization-configurable SLA rules

## Phase 8 — absence workflows

- [x] Parent submit with optional secure justification
- [x] 90-day limit and application overlap check
- [x] PostgreSQL exclusion constraint for concurrent overlap protection
- [x] Parent pending cancellation
- [x] Staff details, filtering, calendar and decisions
- [x] Decision notifications and audit history
- [x] Approved-range attendance synchronization
- [x] Inngest start-day follow-up
- [ ] Neon btree_gist and transaction tests
- [ ] Weekend/holiday policy configuration
- [ ] Playwright absence workflow

## Phase 7 — homework workflows

- [x] Draft/publish/edit/archive/reactivate lifecycle
- [x] Secure teacher and parent attachments
- [x] Per-child assignments and class defaults
- [x] Parent submit/late/resubmit with versioning
- [x] Teacher review/return with feedback
- [x] Parent publication and review notifications
- [x] Inngest due-date reminder workflow
- [x] Teacher-class and parent-child authorization
- [ ] Inngest cloud and R2 integration tests
- [ ] PostgreSQL concurrency tests
- [ ] Playwright end-to-end homework suite

## Phase 6 — activities and private media

- [x] Activity search, details, edit, archive/reactivate
- [x] Draft and parent-visible publication state
- [x] Parent media consent grant/withdrawal
- [x] Child/class consent enforcement
- [x] Cloudflare R2 private storage adapter
- [x] Protected and short-lived signed downloads
- [x] Image re-encoding, resize and metadata removal
- [x] Malware-scanner adapter and upload rate limit
- [x] Plan-based media feature/storage limits
- [x] Parent consent-aware activity gallery
- [ ] R2 and scanner integration tests
- [ ] Orphaned-object cleanup workflow
- [ ] Playwright upload/consent suite

## Phase 5 — attendance and pickup

- [x] Daily class/date attendance grid
- [x] Bulk status recording and all-present action
- [x] Teacher class enforcement
- [x] Arrival and departure timestamps
- [x] Authorized pickup-person registry and validation
- [x] Parent pickup visibility
- [x] Correction request and manager/admin approval
- [x] Before/proposed correction audit data
- [x] Tenant-scoped CSV export with formula-injection protection
- [ ] PostgreSQL transaction and concurrency tests
- [ ] Playwright attendance workflow
- [ ] Operational pickup procedure review

## Phase 4 — core staff workflows

- [x] Search and pagination for children, parents, classes and staff
- [x] Tenant-safe detail APIs and detail pages
- [x] Edit and archive/reactivate workflows
- [x] Parent-child unlink
- [x] Teacher-class unassignment
- [x] Staff role/status changes revoke sessions
- [x] Final-active-admin and self-demotion protections
- [x] Role-sensitive medical, financial and complaint projections
- [ ] PostgreSQL-backed workflow tests
- [ ] Playwright CRUD workflow suite
- [ ] Bulk imports and class transfer history

## Phase 3 — formal RBAC

- [x] Action-level permission catalogue
- [x] Six-role allowed/denied matrix
- [x] Separate operational and financial reporting permissions
- [x] Separate complaint response, assignment and internal-note permissions
- [x] Central object policy module
- [x] Parent and teacher object-scope enforcement on high-risk routes
- [x] Restricted child medical data projection
- [x] Optional PostgreSQL cross-tenant constraint test suite
- [ ] HTTP-level authenticated route matrix tests
- [ ] Run integration suite against isolated Neon test branch
- [ ] Finish repository migration for all direct page queries

## Phase 2 — authentication lifecycle

- [x] Hashed, expiring, single-use staff and parent invitations
- [x] Forgot/reset password without email enumeration
- [x] Resend email adapter
- [x] Upstash distributed limiter with development fallback
- [x] Session versioning and revocation
- [x] Password change and profile update
- [x] Authentication audit events
- [x] Staff role/status changes revoke sessions
- [ ] Neon-backed integration tests
- [ ] Resend domain and production delivery verification
- [ ] Multi-instance Upstash verification
- [ ] Playwright authentication lifecycle suite

## Phase 1 — PostgreSQL and tenant hardening

- [x] Compound tenant foreign keys for highest-risk identity, parent/child, teacher/class, attendance, absence, complaint and payment relationships
- [x] Fresh database-backed tenant authorization context (does not trust stale session roles)
- [x] Initial tenant-aware repositories for children, attendance, complaints and payments
- [x] Parent high-risk read APIs migrated to repositories
- [x] Inactive organizations and inactive subscriptions denied server-side
- [ ] Migrate every remaining direct Prisma operation to repositories
- [ ] Neon development/test/production databases
- [ ] PostgreSQL integration tests
- [ ] Backup/restore test

External credentials are never committed. Infrastructure-dependent items require user-owned service projects and keys.
