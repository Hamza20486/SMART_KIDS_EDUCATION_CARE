# Phase 12 Delivery — SaaS Subscriptions and Server-Enforced Limits

## Delivered

- Versioned entitlement contract for Essential, Pro and Premium
- Child, staff and storage limits
- Feature gates for activity media, homework, advanced communication and reports
- Active/trial date validation on every protected school request
- Server-side child creation/reactivation limits
- Server-side staff invitation, acceptance and reactivation limits
- Central storage usage and capacity calculation
- Manual subscription lifecycle: trial, activation, renewal, plan change, past due, suspension and cancellation
- Calendar-month renewal calculation
- Audited `SubscriptionEvent` history
- Daily expiry job for trials and active periods
- Administrator email/in-app expiry notifications
- Super-admin plan, usage, lifecycle and history dashboard
- No online payment gateway

## Plan contract

### Essential — 299 DH/month

- 100 active children
- 10 active/pending staff accounts
- 100 MB private storage
- Core attendance and basic reports
- Activity media disabled
- Homework disabled
- Advanced complaints/communication disabled

### Pro — 499 DH/month

- 300 active children
- 30 active/pending staff accounts
- 2 GB private storage
- Activity media
- Homework
- Advanced communication
- Basic reports

### Premium — 799 DH/month

- 1,000 active children
- 100 active/pending staff accounts
- 10 GB private storage
- All Pro features
- Advanced reports entitlement

Limits are versioned in code and persisted in `SubscriptionPlan.features`. Business owners can revise the numbers in a later approved pricing decision.

## Authorization behavior

A school request is accepted only when:

- the organization is active;
- a trial has not passed `trialEndsAt`; or
- an active subscription has not passed `currentPeriodEnd`.

Plan checks execute inside server authorization and mutation paths. Hiding navigation is only a convenience; direct API requests receive a denial.

`SUPER_ADMIN` can manage plans and subscription metadata but does not inherit school feature or child-data access.

## Data model

- `Subscription.suspendedAt`
- `Subscription.cancelledAt`
- tenant-compound subscription identity
- append-only `SubscriptionEvent` lifecycle history

Migration: `prisma/migrations/20260817130000_subscription_entitlements/migration.sql`.

## Automated verification

Unit tests cover:

- plan hierarchy and feature differences;
- legacy JSON normalization;
- trial and active-period expiry;
- projected usage limits;
- calendar-month renewal.

An optional PostgreSQL integration test verifies that projected child usage is denied above the configured plan limit.

## Remaining production verification

- Apply both Phase 11 and Phase 12 migrations to isolated PostgreSQL.
- Run subscription limit and concurrency integration tests.
- Verify the lifecycle sweep in Inngest staging.
- Decide final commercial limits with the product owner.
- Add Playwright tests for super-admin lifecycle actions and direct API feature denial.
- Add advanced report implementations in Phase 14; Phase 12 only provides the entitlement.
