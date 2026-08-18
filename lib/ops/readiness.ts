import { prisma } from "../prisma";
import { checkRateLimitStore } from "../rate-limit";
import { checkPrivateStorage } from "../storage";
import { logger } from "../observability/logger";

type CheckResult = {
  ok: boolean;
  detail: string;
  latencyMs: number;
};

async function timedCheck(action: () => Promise<{ ok: boolean; detail: string }>) {
  const startedAt = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      action(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), 5_000);
      }),
    ]);
    return { ...result, latencyMs: Date.now() - startedAt } satisfies CheckResult;
  } catch {
    return {
      ok: false,
      detail: "unreachable",
      latencyMs: Date.now() - startedAt,
    } satisfies CheckResult;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function configured(...names: string[]) {
  return names.every((name) => Boolean(process.env[name]));
}

export async function productionReadiness() {
  const [database, redis, storage] = await Promise.all([
    timedCheck(async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, detail: "reachable" };
    }),
    timedCheck(checkRateLimitStore),
    timedCheck(checkPrivateStorage),
  ]);
  const checks = {
    database,
    redis,
    storage,
    queue: {
      ok: configured("INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"),
      detail: configured("INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY")
        ? "configured"
        : "not_configured",
      latencyMs: 0,
    },
    email: {
      ok: configured("RESEND_API_KEY", "EMAIL_FROM"),
      detail: configured("RESEND_API_KEY", "EMAIL_FROM")
        ? "configured"
        : "not_configured",
      latencyMs: 0,
    },
    malwareScanner: {
      ok: configured("MALWARE_SCAN_WEBHOOK_URL", "MALWARE_SCAN_API_KEY"),
      detail: configured("MALWARE_SCAN_WEBHOOK_URL", "MALWARE_SCAN_API_KEY")
        ? "configured"
        : "not_configured",
      latencyMs: 0,
    },
    errorTracking: {
      ok: configured("SENTRY_DSN"),
      detail: configured("SENTRY_DSN") ? "configured" : "not_configured",
      latencyMs: 0,
    },
  };
  const ok = Object.values(checks).every((check) => check.ok);
  logger[ok ? "info" : "warn"]("ops.readiness", {
    ok,
    database: database.ok,
    redis: redis.ok,
    storage: storage.ok,
    queue: checks.queue.ok,
    email: checks.email.ok,
    malwareScanner: checks.malwareScanner.ok,
    errorTracking: checks.errorTracking.ok,
  });
  return { ok, checks, checkedAt: new Date().toISOString() };
}
