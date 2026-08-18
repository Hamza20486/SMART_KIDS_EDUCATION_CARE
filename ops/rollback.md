# Rollback Procedure

## Application-only rollback

1. Declare the incident and freeze additional deployments.
2. Identify the last healthy immutable Vercel deployment and release SHA.
3. Confirm that its schema compatibility includes all migrations already applied.
4. Promote the healthy deployment through Vercel rollback/alias controls.
5. Run liveness, readiness and HTTP smoke tests.
6. Monitor error rate, queue backlog and database health for at least 30 minutes.
7. Record timeline, approver and deployment IDs.

## Database-aware rollback

Database migrations are forward-only. Do not manually reverse a production migration unless a reviewed corrective migration is impossible.

- For expand-and-contract releases, roll application code back while leaving additive schema changes in place.
- For a defective data migration, stop writers, take an additional backup, apply a reviewed forward corrective migration and verify counts/invariants.
- Use PITR only for catastrophic corruption or deletion. PITR creates a new database/branch; validate it before switching connection secrets.
- Never point production at a restore until database smoke tests and critical Playwright flows pass.

## Secret/config rollback

Vercel environment changes create deployment-scoped configuration. Restore the prior value through secret management, redeploy the known-good SHA, rotate any exposed value, and document who accessed it.

## Rollback triggers

Rollback immediately for confirmed cross-tenant exposure, authentication bypass, destructive migration behavior, sustained 5xx above 5%, inability to record attendance/payments, or unrecoverable queue duplication. Minor visual defects should normally use a forward fix.
