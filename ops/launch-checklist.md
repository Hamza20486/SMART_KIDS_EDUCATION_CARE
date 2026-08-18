# Staging and Production Infrastructure Checklist

## Staging

- [ ] Separate Vercel project and synthetic-data-only database
- [ ] Pooled runtime and direct migration connections verified
- [ ] R2 media/backup buckets private
- [ ] Upstash, Inngest, Resend, scanner and Sentry test environments connected
- [ ] Production environment contract validates
- [ ] Migrations apply from an empty database and from the prior release
- [ ] Phase 15 unit, PostgreSQL and Playwright tests pass
- [ ] Liveness/readiness external monitors green
- [ ] Central log drain receives redacted JSON
- [ ] Email, queue and private-media canaries pass
- [ ] Restore drill and smoke tests pass

## Production

- [ ] Protected Vercel/GitHub environments require approval
- [ ] Managed PostgreSQL HA, connection pooling, backups and PITR enabled
- [ ] Backup lifecycle, object versioning and monthly drill scheduled
- [ ] Domain, TLS, SPF, DKIM and DMARC configured
- [ ] Quota/billing alerts configured for every provider
- [ ] Sentry release/source maps and alert routes verified
- [ ] Incident contacts, privacy lead and provider escalation paths current
- [ ] Last healthy deployment and rollback procedure recorded
- [ ] Seed/demo credentials absent or rotated
- [ ] Security/legal/privacy approvals attached to release record
- [ ] Production smoke tests and 30-minute observation completed

Phase 16 exit requires evidence that a production-format backup was restored into a clean environment and database, HTTP, and critical browser smoke tests all passed.
