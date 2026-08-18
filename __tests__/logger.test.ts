import { afterEach, describe, expect, it, vi } from "vitest";
import { logger } from "@/lib/observability/logger";

describe("structured production logging", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("writes machine-readable release and service context", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOG_LEVEL", "info");
    vi.stubEnv("SERVICE_NAME", "smart-kids-test");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logger.info("backup.completed", { count: 2, ok: true });
    const entry = JSON.parse(String(info.mock.calls[0][0]));
    expect(entry).toMatchObject({
      level: "info",
      service: "smart-kids-test",
      release: "abc123",
      event: "backup.completed",
      count: 2,
      ok: true,
    });
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("redacts sensitive context and respects log levels", () => {
    vi.stubEnv("LOG_LEVEL", "warn");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logger.info("ignored", { count: 1 });
    logger.warn("security.event", {
      authorization: "Bearer secret",
      childId: "child-a",
      medicalNote: "private",
    });
    expect(info).not.toHaveBeenCalled();
    const entry = JSON.parse(String(warn.mock.calls[0][0]));
    expect(entry.authorization).toBe("[REDACTED]");
    expect(entry.medicalNote).toBe("[REDACTED]");
    expect(entry.childId).toBe("child-a");
  });
});
