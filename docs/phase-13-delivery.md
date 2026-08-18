# Phase 13 Delivery — French, Arabic RTL and English

## Delivered

- Locale-prefixed application URLs: `/fr`, `/ar` and `/en`
- Middleware rewrite preserving the existing application route tree
- Locale cookie and browser-language negotiation with French as fallback
- Typed translation catalogue with 403 keys in all three languages
- Translation namespaces for common UI, authentication, navigation, parent, staff, attendance, homework, complaints, payments, notifications, subscriptions, forms, roles and workflows
- Server-component translator and client translation provider
- Persistent global language switcher
- Arabic `dir="rtl"` document mode and RTL layout/table/form styles
- Locale-aware Morocco dates and MAD currency helpers
- Localized public site, authentication, navigation, core parent views, SaaS administration, shared forms, common tables, actions, statuses and notification labels
- Plan-aware navigation remains enforced under localized routes
- Translation-key parity validation command
- Automated translation, interpolation, RTL and MAD formatting tests

## Routing behavior

The browser keeps a locale-prefixed URL while middleware rewrites internally to the preserved App Router path. For example:

```text
/en/parent/payments -> /parent/payments
/ar/admin/attendance -> /admin/attendance
```

API routes are not localized and continue to use stable relative URLs. Protected-route cookie checks are applied after removing the locale prefix.

## Commands

```bash
npm run i18n:check
npm test -- __tests__/i18n.test.ts
```

## Verification performed

- `/` redirects to `/fr` by default.
- `/en` renders English public content.
- `/ar` renders Arabic content with `dir="rtl"`.
- `/en/admin` redirects unauthenticated users to `/en/login`.
- English and Arabic login pages render translated content.
- Translation validation reports identical non-empty keys in French, Arabic and English.

## Production sign-off still required

- Native-speaker review of all Arabic and English copy
- Playwright coverage for every role in all locales
- Complete migration of dynamic API errors, background notification bodies, email bodies and generated PDF/export copy to translation keys
- Arabic-capable embedded font for generated PDF reports and receipts
- Automated source policy for remaining dynamic hard-coded messages

The UI localization architecture and primary application surfaces are implemented. The items above are required before Phase 13 can be signed off as fully production-complete under the original zero-hardcoded-copy criterion.
