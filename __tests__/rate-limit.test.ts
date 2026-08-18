import { afterEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";

describe("rate limiting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("allows requests up to the local policy limit and then denies", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const identifier = `login-${crypto.randomUUID()}`;
    await expect(checkRateLimit("login", identifier)).resolves.toEqual({
      success: true,
      retryAfter: 0,
    });
    for (let index = 1; index < 10; index += 1) {
      await expect(checkRateLimit("login", identifier)).resolves.toEqual({
        success: true,
        retryAfter: 600,
      });
    }
    await expect(checkRateLimit("login", identifier)).resolves.toEqual({
      success: false,
      retryAfter: 600,
    });
  });

  it("starts a fresh local window after expiry", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const now = vi.spyOn(Date, "now");
    const identifier = `forgot-${crypto.randomUUID()}`;
    now.mockReturnValue(2_000_000);
    await expect(checkRateLimit("forgot", identifier)).resolves.toMatchObject({ success: true });
    now.mockReturnValue(2_000_000 + 3_600_001);
    await expect(checkRateLimit("forgot", identifier)).resolves.toEqual({
      success: true,
      retryAfter: 0,
    });
  });

  it("derives a normalized identifier from proxy headers and email", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(requestIdentifier(request, "Parent@Example.Test")).toBe(
      "203.0.113.10:parent@example.test",
    );
  });

  it("falls back through real IP and unknown identifiers", () => {
    expect(
      requestIdentifier(
        new Request("https://example.test", {
          headers: { "x-real-ip": "198.51.100.4" },
        }),
      ),
    ).toBe("198.51.100.4");
    expect(requestIdentifier(new Request("https://example.test"))).toBe("unknown");
  });
});
