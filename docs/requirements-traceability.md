# Requirements Traceability

Status: ✅ implemented, 🟡 partial, ⬜ pending, 🚫 intentionally excluded.

| Requirement | Schema | Authorization | API/UI | Tests | Status |
|---|---|---|---|---|---|
| Multi-tenant organizations | Organization + organizationId | Server context | Platform admin | Unit only | 🟡 |
| Parent cannot access another child | ParentChild | Relationship policy | Parent APIs | Integration pending | 🟡 |
| Teacher assigned classes only | ClassTeacher | Class policy | Teacher APIs | Integration pending | 🟡 |
| Six roles | Role/User | Permission map | Role-aware portals | Unit | ✅ |
| Children/parents/classes/staff | Core models | Action RBAC + object policies | Search, pagination, details, edit, archive/reactivate, links/assignments | Integration/E2E pending | 🟡 |
| Attendance + arrival/departure | Attendance + corrections + pickup authorization | Class/child policy + approval split | Daily bulk grid, times, pickup validation, corrections, parent view, CSV | Integration/E2E pending | 🟡 |
| Activities + media | Activity/ActivityMedia/MediaConsent | Class/child/consent policy | Full lifecycle, private gallery, R2 adapter, sanitization, quotas | Cloud integration/E2E pending | 🟡 |
| Homework/submission | Homework/Attachment/Assignment/Submission | Class/child policy | Full lifecycle, attachments, versioned submissions, review, reminders | Cloud integration/E2E pending | 🟡 |
| Absence requests | Request/Attachment + exclusion constraint | Parent/class/reviewer policy | Submit, justify, cancel, decide, calendar, attendance sync, reminders | DB/E2E pending | 🟡 |
| Complaints/messages | Complaint/Message/Attachment | Owner/respond/assign/internal policy | Full thread, attachments, SLA, escalation, notifications | Unit done; DB/E2E pending | 🟡 |
| Payments/receipts | Category/Payment/Transaction/Receipt/Sequence | Accountant/parent policy | Partial manual payments, PDF receipts, void/reissue, reports, CSV/XLSX | Concurrency/E2E/legal review pending | 🟡 |
| Operational/financial reports | Existing tenant operational and finance models | Separate report permissions + authenticated tenant/class scope | Date/class dashboards, print, audited safe CSV/XLSX/PDF export | Unit done; DB/E2E/performance pending | 🟡 |
| Platform SaaS reports | Organization/Subscription/Plan + usage aggregates | Platform-only permission | Plan/status/trial/expiry/suspension/usage dashboard and exports | Unit done; E2E pending | 🟡 |
| Notifications/announcements | Models present | User/role policy | In-app basic | Delivery pending | 🟡 |
| SaaS plans 299/499/799 DH | Plan/Subscription/Event + typed entitlements | Platform-only management + server feature/limit gates | Lifecycle and usage dashboard | Unit done; DB/E2E pending | 🟡 |
| Real payment processing | N/A | N/A | Not implemented | N/A | 🚫 |
| French | Locale catalogue | Locale middleware/provider | Default `/fr` UI | Unit done; copy review pending | 🟡 |
| Arabic/English | Locale catalogue + formatters | Same authorization under locale rewrites | `/ar` RTL and `/en` UI | Unit done; E2E/native review pending | 🟡 |
| Invitations/password reset | Hashed token models | Single-use/expiry/session revocation | Staff + public flows | Unit; integration pending | 🟡 |
| Distributed rate limiting | N/A | Upstash + development fallback | Auth endpoints | Multi-instance test pending | 🟡 |
| Production media | ActivityMedia | Policy exists | R2 pending | Pending | ⬜ |
| Background jobs | Durable OutboxEvent | Event-scoped + idempotent recipients | Inngest dispatch, recovery sweep and schedules | Unit done; cloud/E2E pending | 🟡 |
| Production infrastructure | Vercel/Neon/R2/Upstash/Inngest/Resend/Sentry contract | Environment isolation + least privilege | Readiness, validation, deployment templates and runbooks | User-owned provisioning pending | 🟡 |
| Backup and restore | Neon PITR + private R2 logical dumps | Direct backup/restore roles + safe target guard | Daily backup, retention, restore and smoke tooling | Clean-environment drill pending | 🟡 |
| PostgreSQL isolation tests | Real PostgreSQL 16 in CI | Constraints + repositories + policies | 11 tests implemented | CI execution pending | 🟡 |
| Unit testing | Critical domain/service modules | RBAC, tenant, ownership, feature and repository boundaries | 180 tests + enforced coverage gate | 92.37% statements / 79.82% branches / 94.01% functions / 94.36% lines | ✅ |
| Playwright E2E | Seeded isolated PostgreSQL + Chromium | All roles and high-risk allow/deny paths | 29 tests implemented | CI execution pending | 🟡 |
