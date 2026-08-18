import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const productionReadiness = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ops/readiness", () => ({ productionReadiness }));

import { GET as live } from "@/app/api/health/live/route";
import { GET as ready } from "@/app/api/health/ready/route";

describe("operational health routes", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HEALTHCHECK_TOKEN", "h".repeat(32));
    productionReadiness.mockResolvedValue({
      ok: true,
      checks: { database: { ok: true } },
      checkedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("exposes non-sensitive liveness without caching", async () => {
    const response = live();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      status: "ok",
      service: "smart-kids-web",
    });
  });

  it("protects deep readiness with a timing-safe bearer token", async () => {
    const unauthorized = await ready(new Request("https://example.test"));
    expect(unauthorized.status).toBe(401);
    expect(productionReadiness).not.toHaveBeenCalled();

    const response = await ready(
      new Request("https://example.test", {
        headers: { authorization: `Bearer ${"h".repeat(32)}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(productionReadiness).toHaveBeenCalledOnce();
  });

  it("returns service unavailable when any dependency is down", async () => {
    productionReadiness.mockResolvedValue({
      ok: false,
      checks: { database: { ok: false } },
      checkedAt: new Date().toISOString(),
    });
    const response = await ready(
      new Request("https://example.test", {
        headers: { authorization: `Bearer ${"h".repeat(32)}` },
      }),
    );
    expect(response.status).toBe(503);
  });
});
