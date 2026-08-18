import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appUrl,
  createOpaqueToken,
  hashToken,
} from "@/lib/security-tokens";

describe("security tokens", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("creates high-entropy opaque tokens and stores only hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first.token).not.toBe(second.token);
    expect(first.token.length).toBeGreaterThanOrEqual(40);
    expect(first.tokenHash).toBe(hashToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
  });

  it("rejects token mutation through a different digest", () => {
    const { token, tokenHash } = createOpaqueToken();
    expect(hashToken(`${token}x`)).not.toBe(tokenHash);
  });

  it("normalizes configured application URLs and has a development fallback", () => {
    vi.stubEnv("APP_URL", "https://smart-kids.example/");
    expect(appUrl()).toBe("https://smart-kids.example");
    vi.stubEnv("APP_URL", "");
    vi.stubEnv("AUTH_URL", "https://auth.example/");
    expect(appUrl()).toBe("https://auth.example");
    vi.stubEnv("AUTH_URL", "");
    expect(appUrl()).toBe("http://localhost:3000");
  });
});
