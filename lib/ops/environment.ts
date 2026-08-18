import { z } from "zod";

const productionEnvironmentSchema = z
  .object({
    NODE_ENV: z.literal("production"),
    DATABASE_URL: z.string().url(),
    PRISMA_MIGRATION_DATABASE_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_TRUST_HOST: z.enum(["true", "1"]),
    APP_URL: z.string().url().startsWith("https://"),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(3),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(3),
    BACKUP_R2_ACCOUNT_ID: z.string().min(1),
    BACKUP_R2_ACCESS_KEY_ID: z.string().min(1),
    BACKUP_R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BACKUP_BUCKET: z.string().min(3),
    MALWARE_SCAN_WEBHOOK_URL: z.string().url(),
    MALWARE_SCAN_API_KEY: z.string().min(1),
    INNGEST_EVENT_KEY: z.string().min(1),
    INNGEST_SIGNING_KEY: z.string().min(1),
    SENTRY_DSN: z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().url(),
    SENTRY_ORG: z.string().min(1),
    SENTRY_PROJECT: z.string().min(1),
    SENTRY_AUTH_TOKEN: z.string().min(1),
    SENTRY_ENVIRONMENT: z.enum(["staging", "production"]),
    HEALTHCHECK_TOKEN: z.string().min(32),
    LOG_LEVEL: z.enum(["info", "warn", "error"]),
    BACKUP_RETENTION_DAYS: z.coerce.number().int().min(7).max(3650),
    ALLOW_UNPOOLED_DATABASE_URL: z.enum(["true", "false"]).optional(),
  })
  .superRefine((environment, context) => {
    const runtime = new URL(environment.DATABASE_URL);
    const migration = new URL(environment.PRISMA_MIGRATION_DATABASE_URL);
    const runtimeLooksPooled =
      runtime.hostname.includes("pooler") ||
      runtime.searchParams.get("pgbouncer") === "true";
    if (
      !runtimeLooksPooled &&
      environment.ALLOW_UNPOOLED_DATABASE_URL !== "true"
    ) {
      context.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "Runtime DATABASE_URL must use a connection pooler",
      });
    }
    if (
      migration.hostname.includes("pooler") ||
      migration.searchParams.get("pgbouncer") === "true"
    ) {
      context.addIssue({
        code: "custom",
        path: ["PRISMA_MIGRATION_DATABASE_URL"],
        message: "Migration URL must be a direct PostgreSQL connection",
      });
    }
  });

export function validateProductionEnvironment(
  environment: Record<string, string | undefined>,
) {
  return productionEnvironmentSchema.parse(environment);
}

export function productionEnvironmentIssues(
  environment: Record<string, string | undefined>,
) {
  const result = productionEnvironmentSchema.safeParse(environment);
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));
}
