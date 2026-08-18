# Phase 2 Delivery — Authentication Lifecycle

## Implemented

- Staff and parent invitation API and UI
- 256-bit opaque invitation tokens; only SHA-256 hashes stored
- 48-hour invitation expiry and atomic single-use consumption
- Parent invitation linked to an existing tenant-scoped Parent record
- Email ownership verification through invitation acceptance
- Forgot-password page with non-enumerating responses
- 30-minute, hashed, single-use password reset tokens
- Password reset invalidates all existing sessions
- Password change with current-password verification
- Session versioning and server-side revocation
- Fresh database account/organization checks on every protected operation
- Account profile update
- Staff role/status update API invalidates sessions
- Five-failure account lock plus Upstash distributed rate limits
- In-memory development rate-limit fallback
- Resend delivery adapter with development mail logging
- Authentication audit events for login, invitations, reset, password change and session revocation
- 12-character password minimum with upper/lowercase and number for new credentials

## Required production configuration

- `APP_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM` using a verified Resend domain
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

In production, missing Resend credentials cause delivery to fail rather than silently pretending to send. Upstash should be configured before exposing authentication endpoints publicly.

## Remaining infrastructure-dependent verification

- Apply both Prisma migrations to Neon
- Run invitation and reset integration tests against the test database
- Verify Resend delivery on the production domain
- Verify Upstash counters from multiple Vercel instances
- Browser E2E tests for invitation, reset and session revocation
