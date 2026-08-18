# Phase 15 Delivery — Automated Testing

## Delivered

Phase 15 now contains three deliberately separated layers:

- 180 passing unit tests across 38 unit-test files
- 11 PostgreSQL integration tests across four suites
- 29 Playwright tests across desktop Chromium and a mobile Chromium project

### Unit coverage

- All shared Zod validation schemas and domain boundaries
- Permission matrix, subscription feature gates and fresh authorization context
- Tenant, parent-owner and teacher-class object policies
- Tenant-scoped repositories and medical/financial projection rules
- Money calculations, financial statuses, receipt numbers and PDF generation
- Morocco date/time behavior and absence/complaint status transitions
- Subscription lifecycle, capacity, staff, storage and report limits
- Attachment validation, malware fail-closed behavior, consent and private storage
- Notification recipients, preferences, outbox idempotency and email escaping
- Report aggregation, export safety, formula-injection protection and size limits
- Suspended user/organization and private-file authorization denial paths

### PostgreSQL integration suites

The integration suites use `TEST_DATABASE_URL` and a migrated, isolated PostgreSQL database. They verify:

- Compound tenant constraints on parent-child and teacher-class relationships
- Organization-scoped repository filtering against real relational data
- Parent ownership and teacher assigned-class filtering
- Transaction rollback behavior
- Atomic payment transaction reconciliation
- Subscription capacity enforcement
- Suspended subscription denial
- Tenant-safe, idempotent notification outbox processing

Integration test modules load Prisma dynamically only when a test database is configured. Without `TEST_DATABASE_URL`, the suites report as skipped rather than failing during import.

### Security proof matrix

| Required proof | Automated coverage |
|---|---|
| Organization A cannot access Organization B | PostgreSQL repository test + authenticated HTTP test |
| Parent A cannot access Parent B's child | PostgreSQL ownership test + authenticated HTTP test |
| Teacher cannot access unassigned classes | PostgreSQL repository test + authenticated HTTP test |
| Accountant cannot access complaints or medical details | Permission unit test + authenticated HTTP/projection test |
| Parent cannot invoke staff APIs | Permission unit test + authenticated HTTP test |
| Super-admin cannot inspect child data | Permission unit test + authenticated HTTP test |
| Suspended users and organizations are denied | Authentication unit test + Playwright login denial |
| Private files require authorization | Route unit tests + unauthenticated/parent Playwright denials |

### Playwright end-to-end suites

Playwright covers:

- Anonymous and invalid authentication behavior
- Admin, manager, teacher, accountant, parent and super-admin dashboards
- Parent child, attendance, homework, payments, absence and complaint flows
- Teacher daily attendance recording
- Manager attendance, absence and complaint views
- Accountant payments and financial reports
- SaaS organization creation
- Arabic `lang="ar"` and `dir="rtl"`
- Mobile parent navigation and horizontal overflow checks
- Allowed and denied HTTP behavior for every high-risk role boundary

The Playwright global setup seeds deterministic test accounts and creates isolated cross-tenant, unassigned-class, suspended-identity and private-media fixtures.

## Continuous verification

`ops/ci/phase15-testing.yml.example` is a ready-to-install GitHub Actions workflow that provisions PostgreSQL 16, applies migrations, generates Prisma Client, runs lint/i18n/unit coverage, executes real integration tests, installs Chromium and runs Playwright. Failure artifacts retain the Playwright report for seven days. It must be copied to `.github/workflows/phase15-testing.yml` by a GitHub identity with workflow-management permission.

## Coverage gate

`npm run test:coverage` measures critical domain, authorization, report, repository, notification, localization, storage and subscription modules.

| Metric | Minimum | Phase 15 result |
|---|---:|---:|
| Statements | 85% | 92.37% |
| Branches | 65% | 79.82% |
| Functions | 85% | 94.01% |
| Lines | 88% | 94.36% |

## Commands

```bash
npm test
npm run test:coverage
npm run test:integration # requires migrated TEST_DATABASE_URL
npm run test:e2e         # requires DATABASE_URL and installed Chromium
npm run test:phase15     # all three layers
```

## Environment-dependent sign-off

- The sandbox has no PostgreSQL server or Docker, so integration and browser execution must pass in a PostgreSQL-backed CI job before Phase 15 is marked fully complete.
- Install the supplied workflow template under `.github/workflows/` using a GitHub connection with workflow permission; the current GitHub App cannot create workflow files.
- Generate Prisma Client and run the full typecheck/build gate where Prisma engine downloads are available.
- Exercise R2, Upstash, Resend, malware scanning and Inngest provider adapters in staging.
- Resolve the current `deepmerge-ts` advisory inherited through Prisma configuration when a compatible upstream patch is available; npm's present force-fix proposes an incompatible Prisma downgrade.
