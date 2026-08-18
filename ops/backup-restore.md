# Backups, PITR, and Restore Drills

## Required protection

1. Enable managed PostgreSQL point-in-time recovery for production with the commercially approved retention window.
2. Enable provider backup/PITR alerts and restrict restore permissions to the operations role.
3. Run `npm run ops:backup` daily from a protected runner with `pg_dump`, a direct read-capable database URL, and write-only R2 backup credentials.
4. Store logical dumps in a dedicated private R2 bucket with provider encryption at rest, object versioning, and a 90-day lifecycle by default.
5. Block all public bucket access. Backup credentials must not read application media, and application credentials must not access backups.
6. Run an automated restore drill on the first day of every month.

`ops/ci/backup-restore.yml.example` contains the daily backup and monthly clean-database restore jobs.

## Daily logical backup

```bash
export PRISMA_MIGRATION_DATABASE_URL='postgresql://...direct...'
export R2_BACKUP_BUCKET='smart-kids-backups-production'
npm run ops:backup
```

The command creates a PostgreSQL custom-format dump, calculates SHA-256, uploads it privately with checksum metadata, and prunes objects older than `BACKUP_RETENTION_DAYS`. Logs contain the object key and checksum but no database credentials.

## Restore drill

Create an empty database whose name contains `restore`, `drill`, `test`, or `staging`. Never reuse the active application database.

```bash
export RESTORE_DATABASE_URL='postgresql://.../smart_kids_restore_drill'
export BACKUP_OBJECT_KEY='latest'
npm run ops:restore
```

The restore command:

1. Refuses the active runtime database and unsafe target names.
2. Downloads the private backup.
3. Verifies the stored SHA-256 checksum.
4. Runs `pg_restore --clean --if-exists --exit-on-error`.
5. Applies any newer reviewed migrations.
6. Runs database smoke tests for connectivity, core records, migrations and tenant relationship integrity.

After database checks, deploy the matching application SHA against the restored database in an isolated environment and run:

```bash
SMOKE_BASE_URL=https://restore-drill.example.test npm run ops:smoke:http
npm run test:e2e
```

## Evidence and acceptance

For every drill retain:

- Backup object key, creation time, checksum and source release
- Restore start/end time and target identifier
- Migration output
- Database and HTTP smoke-test output
- Playwright result
- Recovery time objective and recovery point objective achieved
- Any corrective actions and owner

A backup is not considered valid until this drill succeeds. Never download dumps to personal workstations or attach them to tickets.
