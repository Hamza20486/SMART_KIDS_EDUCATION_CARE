import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthContext: vi.fn(),
  requireFeature: vi.fn(),
  classTeacherFindMany: vi.fn(),
  childFindFirst: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ getAuthContext: mocks.getAuthContext }));
vi.mock("@/lib/auth", () => ({
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/subscriptions/service", () => ({
  featureForPermission: {
    "reports.operational": "basicReports",
    "homework.read": "homework",
  },
  requireFeature: mocks.requireFeature,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    classTeacher: { findMany: mocks.classTeacherFindMany },
    child: { findFirst: mocks.childFindFirst },
  },
}));

import {
  authorizedClassIds,
  requireAnyPermission,
  requirePermission,
  requireTeacherChildAccess,
} from "@/lib/permissions";

const manager = {
  id: "manager-a",
  userId: "manager-a",
  organizationId: "org-a",
  role: "MANAGER",
};

describe("permission service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFeature.mockResolvedValue({});
  });

  it("returns context for a granted permission and enforces plan features", async () => {
    mocks.getAuthContext.mockResolvedValue(manager);
    await expect(requirePermission("reports.operational")).resolves.toBe(manager);
    expect(mocks.requireFeature).toHaveBeenCalledWith(manager, "basicReports");
  });

  it("denies roles without the requested permission before feature checks", async () => {
    mocks.getAuthContext.mockResolvedValue(manager);
    await expect(requirePermission("reports.financial")).rejects.toThrow(
      "Insufficient permission",
    );
    expect(mocks.requireFeature).not.toHaveBeenCalled();
  });

  it("selects the first granted permission from an any-of check", async () => {
    mocks.getAuthContext.mockResolvedValue(manager);
    await expect(
      requireAnyPermission(["reports.financial", "reports.operational"]),
    ).resolves.toBe(manager);
    expect(mocks.requireFeature).toHaveBeenCalledWith(manager, "basicReports");
  });

  it("denies an any-of check when no permission is granted", async () => {
    mocks.getAuthContext.mockResolvedValue(manager);
    await expect(
      requireAnyPermission(["reports.financial", "platform.manage"]),
    ).rejects.toThrow("Insufficient permission");
  });

  it("returns no class scope for non-teachers and reuses a preloaded teacher scope", async () => {
    await expect(authorizedClassIds(manager)).resolves.toBeNull();
    const teacher = {
      id: "teacher-a",
      organizationId: "org-a",
      role: "TEACHER",
      authorizedClassIds: ["class-a"],
    };
    await expect(authorizedClassIds(teacher)).resolves.toEqual(["class-a"]);
    expect(mocks.classTeacherFindMany).not.toHaveBeenCalled();
  });

  it("derives teacher class scope from tenant assignments", async () => {
    mocks.classTeacherFindMany.mockResolvedValue([
      { classId: "class-a" },
      { classId: "class-b" },
    ]);
    await expect(
      authorizedClassIds({
        id: "teacher-a",
        organizationId: "org-a",
        role: "TEACHER",
      }),
    ).resolves.toEqual(["class-a", "class-b"]);
    expect(mocks.classTeacherFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-a", teacherId: "teacher-a" },
      select: { classId: true },
    });
  });

  it("allows assigned teacher child access and denies unassigned children", async () => {
    const teacher = {
      id: "teacher-a",
      organizationId: "org-a",
      role: "TEACHER",
      authorizedClassIds: ["class-a"],
    };
    mocks.childFindFirst.mockResolvedValue({ id: "child-a", classId: "class-a" });
    await expect(requireTeacherChildAccess(teacher, "child-a")).resolves.toMatchObject({
      id: "child-a",
    });
    expect(mocks.childFindFirst).toHaveBeenCalledWith({
      where: { id: "child-a", organizationId: "org-a" },
      select: { id: true, classId: true },
    });

    mocks.childFindFirst.mockResolvedValue({ id: "child-b", classId: "class-b" });
    await expect(requireTeacherChildAccess(teacher, "child-b")).rejects.toThrow(
      "outside assigned classes",
    );
  });

  it("returns not found without disclosing cross-tenant children", async () => {
    mocks.childFindFirst.mockResolvedValue(null);
    await expect(
      requireTeacherChildAccess(manager, "unknown-child"),
    ).rejects.toThrow("Not found");
  });
});
