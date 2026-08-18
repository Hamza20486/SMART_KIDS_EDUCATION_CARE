# Phase 6 Delivery — Activities and Private Media

## Activity lifecycle

- Search and pagination
- Detail page
- Create, edit, archive and reactivate
- Class-wide or child-specific scope
- Internal draft or parent-visible state
- Publication timestamp
- Tenant and teacher-class enforcement

## Private media

- JPEG, PNG and WebP input only
- Maximum 8 MB input
- Strict image decoding
- Automatic orientation
- Maximum 2400×2400 pixels
- Re-encoding to WebP quality 82
- Metadata stripped by re-encoding
- SHA-256 checksum
- Width/height and final size stored
- Malware-scanner adapter
- Cloudflare R2 private bucket adapter
- Development-only private local fallback
- Random, non-identifying object keys
- Authorized 60-second signed R2 download links
- Protected server download fallback
- Soft media deletion plus object deletion
- Upload/delete audit events
- Upstash upload rate limit

## Media consent

- Parent-managed grant/revoke control per linked child
- Consent audit events
- Child and class consent enforcement
- Parent-visible media hidden immediately after withdrawal
- Class media requires consent for every active child in that class
- Parent activity feed only returns active, published and consent-authorized media

## Subscription limits

- Essential: media disabled, 100 MB metadata limit
- Pro: media enabled, 2 GB
- Premium: media enabled, 10 GB
- Storage usage calculated from non-deleted ActivityMedia records
- Server rejects uploads beyond plan limits

## Required production services

- Private Cloudflare R2 bucket
- R2 API credentials restricted to that bucket
- Malware scanning HTTP service
- Upstash Redis

Production refuses uploads if private storage or malware scanning is not configured.

## Remaining verification

- R2 integration test with a dedicated test bucket
- Malware scanner contract test
- PostgreSQL consent/isolation tests
- Playwright upload/gallery/withdrawal test
- Data lifecycle job for failed/orphaned objects
