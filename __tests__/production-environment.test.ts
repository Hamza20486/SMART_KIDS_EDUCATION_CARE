import { describe, expect, it } from "vitest";
import {
  productionEnvironmentIssues,
  validateProductionEnvironment,
} from "@/lib/ops/environment";

function environment() {
  return {
    NODE_ENV: "production",
    DATABASE_URL:
      "postgresql://user:pass@ep-example-pooler.eu.neon.tech/smart_kids?sslmode=require",
    PRISMA_MIGRATION_DATABASE_URL:
      "postgresql://user:pass@ep-example.eu.neon.tech/smart_kids?sslmode=require",
    AUTH_SECRET: "a".repeat(32),
    AUTH_TRUST_HOST: "true",
    APP_URL: "https://app.example.ma",
    RESEND_API_KEY: "resend",
    EMAIL_FROM: "Smart Kids <notifications@example.ma>",
    UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "redis-token",
    R2_ACCOUNT_ID: "account",
    R2_ACCESS_KEY_ID: "access",
    R2_SECRET_ACCESS_KEY: "secret",
    R2_BUCKET: "private-media",
    BACKUP_R2_ACCOUNT_ID: "backup-account",
    BACKUP_R2_ACCESS_KEY_ID: "backup-access",
    BACKUP_R2_SECRET_ACCESS_KEY: "backup-secret",
    R2_BACKUP_BUCKET: "private-backups",
    MALWARE_SCAN_WEBHOOK_URL: "https://scanner.example.ma/scan",
    MALWARE_SCAN_API_KEY: "scanner",
    INNGEST_EVENT_KEY: "event",
    INNGEST_SIGNING_KEY: "signing",
    SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    SENTRY_ORG: "smart-kids",
    SENTRY_PROJECT: "web",
    SENTRY_AUTH_TOKEN: "source-map-token",
    SENTRY_ENVIRONMENT: "production",
    HEALTHCHECK_TOKEN: "h".repeat(32),
    LOG_LEVEL: "info",
    BACKUP_RETENTION_DAYS: "90",
  };
}

describe("production environment contract", () => {
  it("accepts an isolated, pooled and complete service contract", () => {
    const parsed = validateProductionEnvironment(environment());
    expect(parsed.BACKUP_RETENTION_DAYS).toBe(90);
    expect(parsed.DATABASE_URL).toContain("pooler");
  });

  it("rejects missing secrets without exposing values", () => {
    const input = environment();
    input.RESEND_API_KEY = "";
    const issues = productionEnvironmentIssues(input);
    expect(issues).toContainEqual({
      path: "RESEND_API_KEY",
      message: expect.any(String),
    });
    expect(JSON.stringify(issues)).not.toContain(input.AUTH_SECRET);
  });

  it("requires pooling for runtime and a direct migration connection", () => {
    const runtime = environment();
    runtime.DATABASE_URL =
      "postgresql://user:pass@ep-direct.eu.neon.tech/smart_kids?sslmode=require";
    expect(productionEnvironmentIssues(runtime)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "DATABASE_URL" }),
      ]),
    );

    const migration = environment();
    migration.PRISMA_MIGRATION_DATABASE_URL =
      "postgresql://user:pass@ep-pooler.eu.neon.tech/smart_kids?pgbouncer=true";
    expect(productionEnvironmentIssues(migration)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "PRISMA_MIGRATION_DATABASE_URL" }),
      ]),
    );
  });

  it("requires HTTPS and safe backup retention", () => {
    const input = environment();
    input.APP_URL = "http://app.example.ma";
    input.BACKUP_RETENTION_DAYS = "2";
    const paths = productionEnvironmentIssues(input).map((issue) => issue.path);
    expect(paths).toContain("APP_URL");
    expect(paths).toContain("BACKUP_RETENTION_DAYS");
  });
});
