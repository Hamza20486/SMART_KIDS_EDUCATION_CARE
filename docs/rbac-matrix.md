# RBAC Matrix

Authorization uses explicit permissions plus object-level policies. UI visibility is convenience only; pages and APIs authorize independently.

| Capability | Super Admin | Admin | Manager | Teacher | Accountant | Parent |
|---|---:|---:|---:|---:|---:|---:|
| Platform organizations/subscriptions | ✓ | — | — | — | — | — |
| Child identity read | — | ✓ | ✓ | assigned classes | minimal | linked children |
| Child medical/allergy data | — | ✓ | ✓ | — | — | — |
| Create/update/archive children | — | ✓ | ✓ | — | — | — |
| Parents | — | ✓ | ✓ | — | read for finance | own profile only |
| Parent-child links/invitations | — | ✓ | ✓ | — | — | — |
| Classes | — | ✓ | ✓ | assigned only | — | child class only |
| Teacher assignments | — | ✓ | ✓ | — | — | — |
| Attendance | — | full | operational | assigned only | — | linked children read |
| Activities/media | — | full | full | assigned only | — | linked children read |
| Homework | — | full | full | assigned only | — | linked children read/submit |
| Absence requests | — | review | review | assigned read | — | linked children submit |
| Complaints | — | full/internal | respond/internal | — | — | own only, no internal notes |
| Payments/receipts | — | full | — | — | full | own/authorized children read |
| Staff | — | invite/update | read and assign teachers | — | — | — |
| Announcements | — | publish | publish | read | — | read |
| Operational reports | — | ✓ | ✓ | — | — | — |
| Financial reports | — | ✓ | — | — | ✓ | — |
| Organization settings | — | ✓ | — | — | — | — |

## Object policies

- Tenant records always include the authenticated `organizationId`.
- Parent child access requires an active `ParentChild` record.
- Teacher child/class access requires an active `ClassTeacher` assignment.
- Parent complaint/payment access requires ownership through the authenticated Parent profile.
- Activity media access is checked against its Activity and the current child/class relationship.
- Super Admin does not inherit school data permissions.
- Database role and organization/subscription status are refreshed from PostgreSQL for protected operations.
