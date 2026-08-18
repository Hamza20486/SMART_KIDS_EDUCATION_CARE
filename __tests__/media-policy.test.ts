import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  childFindMany: vi.fn(),
  consentFindMany: vi.fn(),
  getEntitlements: vi.fn(),
  storageUsageBytes: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: { findMany: mocks.childFindMany },
    mediaConsent: { findMany: mocks.consentFindMany },
  },
}));
vi.mock("@/lib/auth", () => ({
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/subscriptions/service", () => ({
  getEntitlements: mocks.getEntitlements,
  storageUsageBytes: mocks.storageUsageBytes,
}));

import {
  activityHasConsent,
  scanForMalware,
  storageQuota,
} from "@/lib/media-security";

describe("media security policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("MALWARE_SCAN_WEBHOOK_URL", "");
    vi.stubEnv("MALWARE_SCAN_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("allows development scanning fallback but fails closed in production", async () => {
    await expect(scanForMalware(Buffer.from("safe"))).resolves.toBe("CLEAN");
    vi.stubEnv("NODE_ENV", "production");
    await expect(scanForMalware(Buffer.from("safe"))).rejects.toThrow(
      "Malware scanner is required",
    );
  });

  it("sends bytes with optional scanner authentication", async () => {
    vi.stubEnv("MALWARE_SCAN_WEBHOOK_URL", "https://scanner.example.test/scan");
    vi.stubEnv("MALWARE_SCAN_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ clean: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(scanForMalware(Buffer.from("payload"))).resolves.toBe("CLEAN");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://scanner.example.test/scan",
      expect.objectContaining({
        method: "POST",
        headers: {
          "content-type": "application/octet-stream",
          authorization: "Bearer secret-key",
        },
      }),
    );
  });

  it("rejects scanner outages and malicious results", async () => {
    vi.stubEnv("MALWARE_SCAN_WEBHOOK_URL", "https://scanner.example.test/scan");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(scanForMalware(Buffer.from("payload"))).rejects.toThrow(
      "scanner unavailable",
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ clean: false }),
      }),
    );
    await expect(scanForMalware(Buffer.from("payload"))).rejects.toThrow(
      "File rejected",
    );
  });

  it("converts configured storage megabytes into a byte quota", async () => {
    mocks.getEntitlements.mockResolvedValue({
      entitlements: { storageMb: 100 },
    });
    mocks.storageUsageBytes.mockResolvedValue(12_345);
    await expect(storageQuota("org-a")).resolves.toEqual({
      limitBytes: 100 * 1_024 * 1_024,
      usedBytes: 12_345,
      enabled: true,
    });
  });

  it("requires consent for a direct child activity", async () => {
    mocks.consentFindMany.mockResolvedValue([{ childId: "child-a" }]);
    await expect(
      activityHasConsent("org-a", { childId: "child-a", classId: null }),
    ).resolves.toBe(true);
    expect(mocks.consentFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        childId: { in: ["child-a"] },
        scope: "ACTIVITY_MEDIA",
        status: "GRANTED",
      },
      select: { childId: true },
    });
  });

  it("requires every active class child to have consent", async () => {
    mocks.childFindMany.mockResolvedValue([{ id: "child-a" }, { id: "child-b" }]);
    mocks.consentFindMany.mockResolvedValue([{ childId: "child-a" }]);
    await expect(
      activityHasConsent("org-a", { childId: null, classId: "class-a" }),
    ).resolves.toBe(false);
    expect(mocks.childFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-a", classId: "class-a", active: true },
      select: { id: true },
    });
    mocks.consentFindMany.mockResolvedValue([
      { childId: "child-a" },
      { childId: "child-b" },
    ]);
    await expect(
      activityHasConsent("org-a", { childId: null, classId: "class-a" }),
    ).resolves.toBe(true);
  });

  it("denies activities without a child scope", async () => {
    await expect(
      activityHasConsent("org-a", { childId: null, classId: null }),
    ).resolves.toBe(false);
    expect(mocks.consentFindMany).not.toHaveBeenCalled();
  });
});
