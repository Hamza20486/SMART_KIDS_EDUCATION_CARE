# Phase 4 Delivery — Core Staff Workflows

## Implemented

### Children

- Search and server-side pagination
- Tenant/teacher scoped list
- Detail page
- Edit identity, birth date and class
- Restricted medical/allergy editing
- Parent, attendance and activity summaries
- Archive and reactivate
- Tenant-safe detail/update/archive APIs

### Parents

- Search by name, phone or email
- Server-side pagination
- Detail page
- Contact editing
- Linked children display
- Parent-child unlink action
- Portal account status
- Payment summary only for financial roles
- Complaint summary only for complaint-authorized roles
- Archive/reactivate synchronized with the linked portal account

### Classes

- Search and pagination
- Detail page and roster
- Capacity, age group and academic-year editing
- Teacher list
- Teacher assignment removal
- Activity/homework counts
- Archive and reactivate

### Staff

- Search and pagination
- Detail page
- Role, profile and status updates
- Session invalidation after every role/status change
- Disable/reactivate
- Last-login and recent audit history
- Class assignments
- Protection against self-disable/self-demotion
- Protection against removing the final active administrator

### Shared operational UX

- Reusable search and pagination controls
- Reusable update forms
- Confirmation for destructive/archive operations
- Audit events for updates, archive, unlink and assignment removal
- No hard deletion of operational records

## Remaining production verification

- PostgreSQL-backed API tests for every update/archive/reactivate path
- Playwright tests for all detail forms and navigation
- Bulk child enrollment and class transfer history
- Configurable custom fields and import workflows
