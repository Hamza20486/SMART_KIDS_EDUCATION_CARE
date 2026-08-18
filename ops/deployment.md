# Deployment and Migration Pipeline

## Branch and environment flow

1. Pull requests run lint, translation parity, unit coverage, PostgreSQL integration, Playwright, typecheck and production build.
2. An approved release commit is deployed to staging from an immutable SHA.
3. Staging migrations run through the direct database URL.
4. Staging deployment and smoke tests must pass before production approval.
5. Production uses a protected GitHub environment with required human reviewers.
6. Production migrations run once, immediately before the compatible application artifact.
7. The production URL is promoted only after readiness and smoke checks pass.

Install `ops/ci/deploy.yml.example` as `.github/workflows/deploy.yml` using an identity with workflow permission. Configure `staging` and `production` GitHub environments and all referenced secrets.

## Migration policy

- Migrations are forward-only and committed under `prisma/migrations/`.
- Use expand-and-contract changes: add nullable/new structures, deploy compatible code, backfill, then remove old structures in a later release.
- Never run `prisma migrate dev`, `db push`, or `migrate reset` against staging or production.
- Runtime serverless functions receive only pooled `DATABASE_URL`.
- The protected migration job receives `PRISMA_MIGRATION_DATABASE_URL`.
- Take/verify a logical backup and confirm PITR health before destructive or high-volume migrations.
- Large backfills run as explicit resumable operations, not inside a request or migration transaction.

## Deployment commands

```bash
npm ci
npm run ops:validate-env
npm run db:deploy
npm run build
npx vercel deploy --prebuilt
npm run ops:smoke:http
```

## Staging gate

Staging must use production-equivalent services with synthetic data. Verify:

- `/api/health/live` returns 200.
- Authenticated `/api/health/ready` returns 200 and every dependency is ready.
- Phase 15 test suites pass.
- Database migrations show no pending or failed rows.
- Inngest endpoint is signed and workers process a canary event.
- Resend delivers to an approved test mailbox.
- R2 signed access works and anonymous access fails.
- Sentry receives a controlled test event without child/parent PII.

## Production gate

Record the release SHA, migration names, backup/PITR timestamp, approver, deployment URL, smoke-test output and rollback candidate. Do not deploy during a provider incident or without an incident commander available for high-risk migrations.
