import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindFirst: vi.fn(),
  getActiveSubscription: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findFirst: mocks.userFindFirst } },
}));
vi.mock("@/lib/subscriptions/service", () => ({
  getActiveSubscription: mocks.getActiveSubscription,
}));

import { requireUser } from "@/lib/auth";

const user = {
  id: "user-a",
  organizationId: "org-a",
  name: "User A",
  email: "user@example.test",
  role: "ADMIN",
  sessionVersion: 2,
};

describe("authenticated user enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-a", role: "ADMIN", sessionVersion: 2 },
    });
    mocks.userFindFirst.mockResolvedValue(user);
    mocks.getActiveSubscription.mockResolvedValue({ id: "subscription-a" });
  });

  it("requires a session and refreshes active user and organization state", async () => {
    await expect(requireUser()).resolves.toEqual(user);
    expect(mocks.userFindFirst).toHaveBeenCalledWith({
      where: {
        id: "user-a",
        active: true,
        organization: { active: true },
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        email: true,
        role: true,
        sessionVersion: true,
      },
    });
  });

  it("denies anonymous, suspended-user, and inactive-organization sessions", async () => {
    mocks.auth.mockResolvedValueOnce(null);
    await expect(requireUser()).rejects.toThrow("Authentication required");

    mocks.userFindFirst.mockResolvedValueOnce(null);
    await expect(requireUser()).rejects.toThrow("Account or organization disabled");
  });

  it("revokes stale session versions and unauthorized roles", async () => {
    mocks.auth.mockResolvedValueOnce({
      user: { id: "user-a", role: "ADMIN", sessionVersion: 1 },
    });
    await expect(requireUser()).rejects.toThrow("Account or organization disabled");
    await expect(requireUser(["MANAGER"])).rejects.toThrow("Insufficient permission");
  });

  it("denies inactive subscriptions for school roles", async () => {
    mocks.getActiveSubscription.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("subscription inactive or expired");
  });

  it("allows platform administrators without a school subscription", async () => {
    const platform = {
      ...user,
      organizationId: "platform",
      role: "SUPER_ADMIN",
    };
    mocks.auth.mockResolvedValue({
      user: { id: "user-a", role: "SUPER_ADMIN", sessionVersion: 2 },
    });
    mocks.userFindFirst.mockResolvedValue(platform);
    await expect(requireUser(["SUPER_ADMIN"])).resolves.toEqual(platform);
    expect(mocks.getActiveSubscription).not.toHaveBeenCalled();
  });
});
