# Phase 16 Delivery — Production Infrastructure

## Implemented in the repository

- Vercel deployment configuration targeting the Paris region
- Pooled runtime versus direct migration PostgreSQL connection contract
- Production environment validation with fail-fast service/secret requirements
- Cloudflare R2 private media adapter hardening and storage-key traversal rejection
- Upstash and R2 dependency readiness probes
- Public liveness and token-protected deep readiness APIs
- Sentry server, edge, browser and global React error instrumentation with PII disabled
- Structured redacted JSON logging and request correlation IDs
- Security headers including CSP, HSTS, frame denial and restrictive browser permissions
- Streaming PostgreSQL custom-format backup upload to private R2 with SHA-256 metadata
- Backup retention pruning and latest-backup selection
- Safeguarded clean-target restore, checksum verification, migration and database smoke tests
- HTTP smoke tests for liveness, readiness, localized homepage and login
- Reviewed templates for staging/production deployment, daily backups and monthly restore drills
- Deployment, migration, backup/PITR, rollback, monitoring, secrets, incident and launch runbooks

## Selected managed services

- Vercel — Next.js hosting and centralized log drain source
- Neon — managed PostgreSQL, pooled runtime endpoint, direct migration endpoint and PITR
- Cloudflare R2 — separate private media and backup buckets
- Upstash Redis — distributed rate limiting
- Inngest — queues, retries and scheduled workers
- Resend — transactional email
- Sentry — error tracking, release correlation and performance traces

No production credentials are committed. `.env.production.example` is the complete contract and `npm run ops:validate-env` validates configured environments without printing values.

## Operations commands

```bash
npm run ops:validate-env
npm run db:deploy
npm run ops:backup
npm run ops:restore
npm run ops:smoke:database
npm run ops:smoke:http
```

## Exit status

The code and runbooks are delivered, but Phase 16 cannot be marked operationally complete inside this sandbox. Completion requires user-owned service projects and evidence that:

1. Staging and production services are provisioned with the documented isolation.
2. The workflow templates are installed using GitHub workflow-management permission.
3. Managed PostgreSQL backups and PITR are enabled.
4. A production-format backup is restored into a clean environment.
5. Database, HTTP and Playwright smoke tests pass against the restored environment.
6. Deployment approval, rollback and incident contacts are exercised and recorded.

The current GitHub App cannot create `.github/workflows/*`; templates remain under `ops/ci/` until the connection has workflow permission.
