# Phase 3 Delivery — Formal RBAC

## Implemented

- Replaced broad `*.manage` permissions with a formal action-level catalogue
- Added allowed/denied matrix for all six roles
- Seeding now derives stored Role permissions from the same code catalogue
- Added `requireAnyPermission` for endpoints serving explicitly separated scopes
- Separated operational and financial reports
- Accountants no longer receive operational complaint/attendance reports
- Child APIs and pages omit medical/allergy fields unless `children.medical.read` is granted
- Staff invitation and parent invitation permissions are distinct
- Complaint response, assignment and internal-note permissions are distinct
- Activity media downloads use centralized object policy checks
- Parent activity, homework, absence, notification and submission APIs now refresh tenant/subscription context
- Added centralized policies for child, class, parent-child, complaint, payment and activity access
- Added exhaustive permission-matrix unit tests
- Added optional real-PostgreSQL tests proving compound foreign keys reject cross-tenant ParentChild and ClassTeacher records

## Test database

The integration suite is intentionally skipped when `TEST_DATABASE_URL` is absent. To run it:

```powershell
$env:TEST_DATABASE_URL="postgresql://...isolated-test-database..."
npm run db:deploy
npm run test:integration
```

Never point this suite at development or production data. The suite creates and deletes test tenants.

## Remaining before Phase 3 can be signed off in production

- Run integration tests on an isolated Neon test branch
- Add HTTP-level authenticated allowed/denied tests for every route
- Complete migration of remaining direct Prisma page queries into repositories
- Verify role changes and session revocation through Playwright
