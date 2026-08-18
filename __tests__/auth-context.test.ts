import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  parentFindFirst: vi.fn(),
  classTeacherFindMany: vi.fn(),
  getActiveSubscription: vi.fn(),
  requireFeature: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    parent: { findFirst: mocks.parentFindFirst },
    classTeacher: { findMany: mocks.classTeacherFindMany },
  },
}));
vi.mock("@/lib/subscriptions/service", () => ({
  getActiveSubscription: mocks.getActiveSubscription,
  requireFeature: mocks.requireFeature,
  featureForPermission: { "reports.operational": "basicReports" },
}));

import {
  getAuthContext,
  requireContextPermission,
} from "@/lib/auth-context";

const baseUser = {
  id: "user-a",
  organizationId: "org-a",
  name: "User A",
  email: "user@example.test",
  role: "ADMIN",
  sessionVersion: 1,
};
const subscription = {
  status: "ACTIVE",
  plan: { code: "PRO" },
};

describe("fresh authorization context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue(baseUser);
    mocks.parentFindFirst.mockResolvedValue(null);
    mocks.classTeacherFindMany.mockResolvedValue([]);
    mocks.getActiveSubscription.mockResolvedValue(subscription);
    mocks.requireFeature.mockResolvedValue({});
  });

  it("loads teacher class assignments from the authenticated tenant", async () => {
    mocks.requireUser.mockResolvedValue({ ...baseUser, role: "TEACHER" });
    mocks.classTeacherFindMany.mockResolvedValue([
      { classId: "class-a" },
      { classId: "class-b" },
    ]);
    await expect(getAuthContext()).resolves.toMatchObject({
      id: "user-a",
      userId: "user-a",
      role: "TEACHER",
      authorizedClassIds: ["class-a", "class-b"],
      parentId: null,
      subscriptionStatus: "ACTIVE",
      planCode: "PRO",
    });
    expect(mocks.classTeacherFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-a", teacherId: "user-a" },
      select: { classId: true },
    });
  });

  it("derives parent identity server-side", async () => {
    mocks.requireUser.mockResolvedValue({ ...baseUser, role: "PARENT" });
    mocks.parentFindFirst.mockResolvedValue({ id: "parent-a" });
    const context = await getAuthContext();
    expect(context.parentId).toBe("parent-a");
    expect(mocks.parentFindFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-a", userId: "user-a" },
      select: { id: true },
    });
  });

  it("does not apply school subscriptions to platform administrators", async () => {
    mocks.requireUser.mockResolvedValue({
      ...baseUser,
      role: "SUPER_ADMIN",
      organizationId: "platform",
    });
    await expect(getAuthContext()).resolves.toMatchObject({
      role: "SUPER_ADMIN",
      subscriptionStatus: null,
      planCode: null,
    });
    expect(mocks.getActiveSubscription).not.toHaveBeenCalled();
  });

  it("fails closed when a school subscription is inactive", async () => {
    mocks.getActiveSubscription.mockResolvedValue(null);
    await expect(getAuthContext()).rejects.toThrow("inactive or expired");
  });

  it("enforces both role permission and subscription feature", async () => {
    const context = await requireContextPermission("reports.operational");
    expect(context.role).toBe("ADMIN");
    expect(mocks.requireFeature).toHaveBeenCalledWith(context, "basicReports");

    mocks.requireUser.mockResolvedValue({ ...baseUser, role: "TEACHER" });
    await expect(
      requireContextPermission("reports.operational"),
    ).rejects.toThrow("Insufficient permission");
  });
});
