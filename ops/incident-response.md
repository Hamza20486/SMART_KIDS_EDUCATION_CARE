# Incident Response

## Severity

- **SEV-1:** child-data exposure, cross-tenant access, credential compromise, destructive data loss, full outage
- **SEV-2:** major workflow unavailable, delayed notifications, payment reconciliation errors, serious degradation
- **SEV-3:** limited defect with workaround and no security/data-integrity impact

## Immediate response

1. Open an incident channel and appoint incident commander, operations lead, communications lead and recorder.
2. Preserve timestamps, release SHA, request IDs, audit logs and provider events. Never paste personal child data into chat/tickets.
3. Contain: disable affected account/organization, revoke credentials, stop workers, block a route or roll back as appropriate.
4. For suspected privacy incidents, preserve evidence and notify the designated privacy/legal lead immediately.
5. Restore service using the rollback and backup procedures; validate tenant isolation before reopening access.
6. Communicate factual status and next update time to affected organizations through an approved channel.

## Credential compromise

Rotate in dependency order: database direct/runtime credentials, Auth secret (forces sessions), R2, Redis, Inngest, Resend, malware scanner, Sentry build token, health token, Vercel/GitHub credentials. Review audit/provider logs and redeploy after rotation.

## Data loss/corruption

Stop writes, capture the incident database state, determine the last known-good recovery point, restore to a new isolated database, run database and application smoke tests, then switch pooled/direct secrets through an approved change.

## Closure

Within five business days produce a blameless review containing impact, data categories, affected tenants, timeline, root cause, detection gap, recovery metrics and assigned corrective actions. Privacy/legal determines notification obligations under Moroccan requirements; engineering does not make that determination alone.
