# Phase 14 Delivery — Reports and Exports

## Delivered

### Operational reporting

- Inclusive date-range and optional class filters
- Attendance totals, absence/late rates and class breakdowns
- Per-child attendance history
- Absence-request counts
- Teacher activity and homework completion
- Complaint resolution totals and average resolution time
- Pickup activity
- Class capacity utilization

### Financial reporting

- Paid, pending, partial, overdue and cancelled status counts
- Gross billing, discounts, net billing, collected revenue and collection rate
- Revenue by month and manual payment method
- Current outstanding balances by child and class
- Partial-payment totals
- Voided and reissued receipt totals

No online payment processing was added. All finance figures continue to use integer MAD centimes and existing manual payment transactions.

### Platform reporting

- Organizations grouped by subscription plan and status
- Active trials, subscriptions expiring within 14 days and suspended subscriptions
- Organization child, staff and private-storage usage against plan limits
- Super-admin-only platform report page and API

### Exports and printing

- A unified `/api/reports/export` route supports CSV, XLSX and landscape PDF
- UTF-8 CSV includes a BOM; XLSX uses a frozen header row and bounded column sizing
- All text cells beginning with `=`, `+`, `-` or `@` are neutralized before spreadsheet export
- Export downloads use private, no-store attachment responses
- Every successful report export creates an `EXPORT` audit event with report kind, format, row count, class and date range metadata
- Report pages include print actions and print-specific layout rules

## Authorization and isolation

- Operational reports require `reports.operational`; financial reports require `reports.financial`; SaaS reports require `platform.manage`
- School report queries always use the authenticated `organizationId`
- Optional class filters are applied server-side
- Existing teacher class assignment derivation and class policy checks are retained as defense in depth
- Parents have no staff report permission and cannot invoke these report endpoints
- Super administrators do not inherit access to organization operational or financial data
- Existing subscription feature enforcement for report permissions remains active
- Synchronous organization reports are limited to an inclusive range of at most 366 days and bounded query sizes

## User interfaces

- `/admin/attendance/reports`
- `/admin/payments/reports`
- `/super-admin/reports`

All three report surfaces and generated column labels use the French, Arabic and English translation catalogues. Locale-aware dates, MAD values, status labels and RTL layout are preserved.

## Automated verification

```bash
npm run lint
npm run i18n:check
npm test
npm audit --omit=dev
```

Tests cover report-range validation, percentage calculation, financial and operational aggregation, tenant/class query scope, role boundaries, CSV formula-injection protection, XLSX/PDF generation and export authorization/auditing.

## Production sign-off still required

- Apply/generate Prisma against an available PostgreSQL environment and run the integration suite
- Add authenticated HTTP and Playwright coverage for every report role, locale and filter combination
- Validate large-tenant query performance and decide whether asynchronous exports are required above current limits
- Embed an Arabic-capable font and shaping solution for native Arabic PDF output; the current standard PDF font uses an ASCII fallback
- Complete finance/report review with the organization and confirm any legally required report/receipt retention rules
