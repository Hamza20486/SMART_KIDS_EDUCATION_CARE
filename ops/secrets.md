# Secrets and Access Management

## Storage

- Production/staging runtime secrets: encrypted Vercel environment variables scoped to the correct project/environment.
- Deployment, migration and backup secrets: protected GitHub environment secrets with required reviewers.
- Developer machines: local `.env` only; never shared through chat, email, source control or issue trackers.
- Use separate credentials and service accounts for runtime, migrations, backups and restore drills.

## Least privilege

- Runtime PostgreSQL user: pooled application DML only; no database creation or ownership.
- Migration user: direct connection with schema migration rights; available only to deployment jobs.
- Backup user: direct read-only access plus required catalog locks.
- R2 application key: one private media bucket.
- R2 backup key: backup bucket only; backup job write/delete by lifecycle, restore job read.
- Sentry build token: source-map upload only; DSN is not treated as an authentication secret.

## Rotation

Rotate production credentials at least annually and immediately after suspected exposure, staff departure or provider warning. Record owner, issue date and next rotation date outside the repository. Rotation must include a no-downtime overlap where supported, deployment, smoke tests and revocation of the prior credential.

## Prohibited values

Never create `NEXT_PUBLIC_*` variables for database credentials, Auth secret, Redis token, R2 secret, Resend key, Inngest keys, malware key, health token, Sentry auth token or backup credentials.

## Access review

Quarterly review Vercel, Neon, Cloudflare, Upstash, Inngest, Resend, Sentry and GitHub memberships. Remove dormant users, require MFA/SSO where available, and keep at least two break-glass owners with logged use.
