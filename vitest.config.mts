import { configDefaults, defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    environment: "node",
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      include: [
        "lib/absence.ts",
        "lib/api.ts",
        "lib/attachment-security.ts",
        "lib/auth.ts",
        "lib/auth-context.ts",
        "lib/complaints.ts",
        "lib/date.ts",
        "lib/email.ts",
        "lib/homework-notifications.ts",
        "lib/i18n/{config,format,index,legacy}.ts",
        "lib/media-image.ts",
        "lib/media-security.ts",
        "lib/notifications/{catalog,outbox,preferences,recipients}.ts",
        "lib/observability/logger.ts",
        "lib/ops/{environment,readiness,restore-safety}.ts",
        "lib/payments.ts",
        "lib/permission-map.ts",
        "lib/permissions.ts",
        "lib/policies.ts",
        "lib/rate-limit.ts",
        "lib/reports/**/*.ts",
        "lib/repositories/**/*.ts",
        "lib/security-tokens.ts",
        "lib/storage.ts",
        "lib/subscriptions/{plans,service}.ts",
        "lib/validation.ts",
      ],
      thresholds: {
        statements: 85,
        branches: 65,
        functions: 85,
        lines: 88,
      },
    },
  },
});
