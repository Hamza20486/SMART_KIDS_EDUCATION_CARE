# Phase 0–1 Delivery

## Completed

- Preserved pre-hardening baseline before edits
- Added requirement-to-code traceability
- Removed duplicate unused server actions
- Added fresh database-backed authorization context
- Role and organization status are re-read from PostgreSQL on protected operations
- Tenant subscriptions must be TRIAL or ACTIVE
- Added initial tenant-aware repositories
- Migrated high-risk parent children, attendance, payment and complaint reads to repositories
- Added compound PostgreSQL tenant foreign keys for parent/child, teacher/class, attendance, absences, complaints and payments
- Generated a fresh hardened PostgreSQL migration
- Prepared environment contract for Neon, Upstash, R2, Resend and Inngest
- Verified Prisma validation, lint, TypeScript, 9 tests, production build and dependency audit

## Blocked on user-owned infrastructure

The following cannot be truthfully completed without service projects/credentials:

1. Neon development, test and production databases
2. Applying the migration and running PostgreSQL integration tests
3. Backup and point-in-time restore exercise
4. Vercel project and environment configuration
5. Upstash, R2, Resend and Inngest service validation

Do not send credentials in chat or commit them. Configure them in local `.env` and hosting dashboards.

## Next phase

Phase 2: invitations, password reset, Resend integration, session revocation, Upstash distributed rate limiting and authentication audit events.
