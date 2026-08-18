# Production Operations

## Approved service topology

| Capability | Selected service | Required control |
|---|---|---|
| Next.js hosting | Vercel | Paris region, immutable deployments, protected production environment |
| Managed PostgreSQL | Neon | Separate development/staging/production projects or branches, pooling, PITR |
| Connection pooling | Neon pooled endpoint | `DATABASE_URL` only; migrations use the direct endpoint separately |
| Private object storage | Cloudflare R2 | Private buckets, no public access, scoped service credentials |
| Redis/rate limiting | Upstash Redis | TLS REST endpoint, production-only token, usage alerting |
| Queue/worker | Inngest | Signed endpoint, production environment, failure/retry alerts |
| Transactional email | Resend | Verified Moroccan/product domain, scoped production key |
| Monitoring/error tracking | Sentry | Separate staging/production environments, source maps, PII disabled |
| Centralized logs | Vercel JSON logs + log drain | Restricted sink, retention and alert rules |
| Secret management | Vercel encrypted environment variables + GitHub environments | No production values in repository or pull-request contexts |
| Backups | Neon PITR plus encrypted-at-rest R2 logical dumps | Daily dumps, 90-day lifecycle, monthly restore drill |

## Environment separation

Use physically separate managed PostgreSQL databases, R2 buckets, Redis databases, Inngest environments, Resend keys, Sentry environments and Vercel projects for staging and production. Never point a preview deployment at production data.

- Runtime application: pooled `DATABASE_URL`
- Migration/backup runner: direct `PRISMA_MIGRATION_DATABASE_URL`
- Restore drill: disposable `RESTORE_DATABASE_URL` whose database name contains `restore`, `test`, `staging`, or `drill`

Validate the production secret contract before deployment:

```bash
npm run ops:validate-env
```

## Operational documents

- [Deployment and migration pipeline](deployment.md)
- [Backups, PITR, and restore drills](backup-restore.md)
- [Monitoring and centralized logging](monitoring.md)
- [Rollback procedure](rollback.md)
- [Incident response](incident-response.md)
- [Secrets and access management](secrets.md)
- [Staging and production checklist](launch-checklist.md)

The YAML files under `ops/ci/` are reviewed workflow templates. A GitHub identity with workflow-management permission must copy them into `.github/workflows/`.
