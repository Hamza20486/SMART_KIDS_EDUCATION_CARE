# Smart Kids Education Care — PostgreSQL SaaS

A multi-tenant nursery and preschool platform for Morocco, built with Next.js, TypeScript, PostgreSQL, Prisma and Auth.js.

## Product defaults

- Organization: Smart Kids Education Care
- City: Casablanca
- Country: Morocco (`MA`)
- Currency: MAD / DH (stored as integer centimes)
- Timezone: `Africa/Casablanca`
- Primary language: French (`/fr`)
- Arabic RTL (`/ar`) and English (`/en`) locale interfaces
- Persistent language switcher and locale-aware Morocco dates/MAD formatting

## Implemented modules

### Parent portal (mobile-first)

- Login and protected session
- Children overview
- Attendance, arrival and departure times
- Activities by child/class
- Homework and parent submissions
- Absence requests
- Complaints and message history
- Payment status and receipts metadata
- Durable in-app/email notifications with channel preferences

### Staff portal (responsive)

- Role-aware dashboard
- Children and parents
- Parent/child linking
- Classes
- Teacher/class assignments
- Attendance
- Arrival/departure and pickup person
- Activities
- Validated private activity media API
- Homework
- Absence review API
- Complaint workflow and messages
- Payments and receipt issuance API (no payment gateway)
- Staff accounts and roles
- Announcements with parent notifications
- Date/class-filtered operational and financial dashboards
- Audited, spreadsheet-safe CSV/XLSX/PDF exports and print-friendly reports
- Organization settings

### SaaS administration

- Platform `SUPER_ADMIN`
- Organization creation
- Initial organization administrator creation
- Audited subscription lifecycle and organization usage dashboard
- Plan/status/trial/expiry/suspension and usage reports with CSV/XLSX/PDF exports
- Essential — 299 DH/month: core operations, 100 children, 10 staff, 100 MB
- Pro — 499 DH/month: media, homework, communication, 300 children, 30 staff, 2 GB
- Premium — 799 DH/month: advanced reports, 1,000 children, 100 staff, 10 GB
- Server-enforced feature, capacity, storage and expiry checks
- No real payment processing

## Security architecture

- Server-side Auth.js sessions and secure cookies
- bcrypt password hashes
- Five-failure account lock for 15 minutes
- Upstash distributed authentication rate limiting
- Hashed, expiring, single-use invitations and password resets
- Resend transactional email adapter
- Transactional notification outbox with idempotent Inngest dispatch, retries and delivery tracking
- Database-backed session versioning and revocation
- Profile and password management
- Centralized role permissions
- All business queries scoped by authenticated `organizationId`
- Parent access derived from `ParentChild`; browser-supplied parent identity is never trusted
- Teacher access derived from `ClassTeacher`
- Separate platform permissions for `SUPER_ADMIN`
- Zod validation on write APIs
- Audit logs for sensitive mutations
- Private randomized media storage keys
- File size, MIME and magic-byte validation
- Deny-by-default navigation plus full authorization inside pages/APIs
- No secret exposed through `NEXT_PUBLIC_*`

## Roles

- `SUPER_ADMIN`
- `ADMIN`
- `MANAGER`
- `TEACHER`
- `ACCOUNTANT`
- `PARENT`

## Database entities

Organization, Role, User, Parent, Child, ParentChild, ClassRoom, ClassTeacher, Attendance, AuthorizedPickupPerson, AttendanceCorrection, Activity, ActivityMedia, MediaConsent, Homework, HomeworkAttachment, HomeworkAssignment, HomeworkSubmission, AbsenceRequest, AbsenceAttachment, Complaint, ComplaintMessage, ComplaintAttachment, FeeCategory, Payment, PaymentTransaction, PaymentReceipt, ReceiptSequence, Notification, Announcement, AuditLog, Subscription and SubscriptionPlan.

## Local installation with Docker

Requirements: Node.js 22 LTS, npm and Docker Desktop.

```powershell
Copy-Item .env.example .env
notepad .env
```

Use:

```env
DATABASE_URL="postgresql://smartkids:smartkids_dev@localhost:5432/smart_kids?schema=public"
AUTH_SECRET="PASTE_A_RANDOM_SECRET"
AUTH_TRUST_HOST="true"
APP_URL="http://localhost:3000"
RESEND_API_KEY=""
EMAIL_FROM="Smart Kids <no-reply@your-verified-domain.ma>"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Generate the secret:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Then:

```powershell
docker compose up -d
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Immediate notifications are processed locally without Inngest when `INNGEST_EVENT_KEY` is blank. Testing delayed reminders and schedules requires an approved Inngest development or staging environment connected to `/api/inngest`.

Open http://localhost:3000.

## Managed PostgreSQL

Create a PostgreSQL database on Neon, Supabase, Railway, Render or another provider. Put its connection URL in `DATABASE_URL`, then run:

```powershell
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

## Production infrastructure and operations

The production contract uses Vercel, Neon pooled/direct PostgreSQL connections, private Cloudflare R2 buckets, Upstash Redis, Inngest, Resend and Sentry. Copy `.env.production.example` into the managed secret stores—never into Git—and validate it with:

```powershell
npm run ops:validate-env
```

Operational commands:

```powershell
npm run ops:backup
npm run ops:restore
npm run ops:smoke:database
npm run ops:smoke:http
```

Deployment, backup/PITR, restore, rollback, monitoring, centralized logging, secret management and incident-response procedures are documented under [`ops/`](ops/README.md). Workflow templates are under `ops/ci/` because installing GitHub Actions requires a GitHub connection with workflow-management permission.

## Development accounts

All seeded accounts use `SmartKids2026!` and must be removed or changed before deployment:

- `superadmin@smartkids.ma`
- `admin@smartkids.ma`
- `manager@smartkids.ma`
- `teacher@smartkids.ma`
- `accountant@smartkids.ma`
- `parent@smartkids.ma`

## Private media configuration

Create a private Cloudflare R2 bucket and configure:

```env
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="smart-kids-private"
MALWARE_SCAN_WEBHOOK_URL=""
MALWARE_SCAN_API_KEY=""
```

The bucket must not be public. Production uploads fail closed when R2 or malware scanning is missing. Development can use `.private-storage`, which is ignored by Git.

## Commands

```powershell
npm run dev
npm test              # unit tests; PostgreSQL suites are excluded
npm run test:coverage # unit tests plus enforced coverage thresholds
npm run test:integration # requires an isolated TEST_DATABASE_URL
npm run test:e2e         # requires DATABASE_URL and Playwright Chromium
npm run test:phase15     # coverage + PostgreSQL + browser suites
npm run check
npm run db:validate
npm run db:migrate
npm run db:deploy
npm run db:seed
npm run db:studio
```

`postinstall` automatically generates Prisma Client.

## Production requirements

Before storing real child information:

1. Use managed PostgreSQL with backups and point-in-time recovery.
2. Replace all seeded users and secrets.
3. Use shared rate limiting at the reverse proxy or Redis layer in addition to account locking.
4. Replace local `.private-storage` with private S3-compatible object storage and short-lived authorized downloads.
5. Configure email delivery for invitations and password resets.
6. Add malware scanning for uploaded files.
7. Add production monitoring, alerting and error reporting.
8. Run PostgreSQL-backed integration and Playwright end-to-end isolation tests.
9. Conduct a security review and Moroccan Law 09-08/CNDP compliance review.
10. Verify retention, consent, backup restoration and incident-response procedures.
