import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  redis: vi.fn(),
  storage: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: mocks.query },
}));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimitStore: mocks.redis }));
vi.mock("@/lib/storage", () => ({ checkPrivateStorage: mocks.storage }));
vi.mock("@/lib/observability/logger", () => ({
  logger: { info: mocks.info, warn: mocks.warn },
}));

import { productionReadiness } from "@/lib/ops/readiness";

describe("production dependency readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query.mockResolvedValue([{ "?column?": 1 }]);
    mocks.redis.mockResolvedValue({ ok: true, detail: "reachable" });
    mocks.storage.mockResolvedValue({ ok: true, detail: "reachable" });
    for (const name of [
      "INNGEST_EVENT_KEY",
      "INNGEST_SIGNING_KEY",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "MALWARE_SCAN_WEBHOOK_URL",
      "MALWARE_SCAN_API_KEY",
      "SENTRY_DSN",
    ]) {
      vi.stubEnv(name, "configured");
    }
  });

  afterEach(() => vi.unstubAllEnvs());

  it("reports ready only when dependencies and service configuration pass", async () => {
    const readiness = await productionReadiness();
    expect(readiness.ok).toBe(true);
    expect(readiness.checks.database.ok).toBe(true);
    expect(readiness.checks.redis.ok).toBe(true);
    expect(readiness.checks.storage.ok).toBe(true);
    expect(mocks.info).toHaveBeenCalledWith(
      "ops.readiness",
      expect.objectContaining({ ok: true }),
    );
  });

  it("fails closed when a provider is unreachable or missing", async () => {
    mocks.redis.mockRejectedValue(new Error("down"));
    vi.stubEnv("RESEND_API_KEY", "");
    const readiness = await productionReadiness();
    expect(readiness.ok).toBe(false);
    expect(readiness.checks.redis).toMatchObject({
      ok: false,
      detail: "unreachable",
    });
    expect(readiness.checks.email).toMatchObject({
      ok: false,
      detail: "not_configured",
    });
    expect(mocks.warn).toHaveBeenCalledWith(
      "ops.readiness",
      expect.objectContaining({ ok: false, redis: false, email: false }),
    );
  });
});
