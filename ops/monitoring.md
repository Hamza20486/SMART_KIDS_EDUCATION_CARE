# Monitoring, Error Tracking, and Logs

## Health endpoints

- `GET /api/health/live` — public process liveness; no dependency or tenant data.
- `GET /api/health/ready` — protected by `Authorization: Bearer $HEALTHCHECK_TOKEN`; checks PostgreSQL, Upstash and R2 reachability plus Inngest, Resend, malware scanner and Sentry configuration.

Monitor liveness every minute and readiness every five minutes from at least two external regions. Alert after two consecutive readiness failures; do not expose the readiness token in browser code.

## Sentry

Server, edge and browser instrumentation is enabled only when a DSN is configured. Defaults:

- PII collection disabled
- Separate staging/production environments
- Release tied to the deployment SHA
- 10% server and 5% browser trace sampling
- Source maps uploaded at build time and deleted from deployment output
- Global React and unhandled API failures captured

Alerts:

- New regression or error rate >1% for five minutes: page on-call
- Authentication or authorization error spike: investigate security incident
- Queue processing failures or repeated payment/receipt exceptions: high-priority alert
- Never attach request bodies, cookies, authorization headers, medical data, complaint content, or child names to Sentry events

## Centralized JSON logs

`lib/observability/logger.ts` writes one-line JSON to stdout for Vercel log drains. Sensitive keys are redacted. Configure a restricted centralized sink and these fields as searchable dimensions:

- `timestamp`, `level`, `service`, `environment`, `release`, `event`
- `x-request-id` response/request correlation identifier
- Non-identifying entity IDs only when operationally necessary

Retention guideline: 30 days for application logs unless the approved retention schedule requires less or a security/legal hold requires more. Audit logs remain in PostgreSQL under their separate approved policy.

## Minimum dashboards

- Request count, p50/p95/p99 latency, 4xx/5xx rate
- PostgreSQL connections, pool saturation, query latency, storage and PITR status
- Redis errors and rate-limit denials
- Inngest backlog, retries, failures and oldest event age
- Resend delivery/failure/bounce rate
- R2 errors, bytes stored and backup age
- Sentry errors by release and route
- Last successful backup and restore drill

## Alert routing

Every production alert needs severity, owner, response target and runbook link. Provider billing/quota alerts must notify an operations mailbox before service suspension thresholds are reached.
