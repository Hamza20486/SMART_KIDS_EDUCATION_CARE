import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  classRoom: { findFirst: vi.fn() },
  child: { findFirst: vi.fn() },
  parentChild: { findFirst: vi.fn() },
  complaint: { findFirst: vi.fn() },
  payment: { findFirst: vi.fn() },
  homework: { findFirst: vi.fn() },
  activity: { findFirst: vi.fn() },
}));
const requireFeature = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: database }));
vi.mock("@/lib/auth", () => ({
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/subscriptions/service", () => ({ requireFeature }));

import {
  assertActivityAccess,
  assertChildAccess,
  assertClassAccess,
  assertComplaintAccess,
  assertHomeworkAccess,
  assertParentChild,
  assertPaymentAccess,
} from "@/lib/policies";
import type { AuthContext } from "@/lib/auth-context";

function context(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    id: "user-a",
    userId: "user-a",
    organizationId: "org-a",
    role: "ADMIN",
    name: "Admin",
    email: "admin@example.test",
    parentId: null,
    authorizedClassIds: null,
    subscriptionStatus: "ACTIVE",
    planCode: "PRO",
    ...overrides,
  };
}

describe("object-level authorization policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFeature.mockResolvedValue({});
  });

  it("always tenant-scopes class access and restricts teachers to assignments", async () => {
    database.classRoom.findFirst.mockResolvedValue({ id: "class-a" });
    await expect(assertClassAccess(context(), "class-a")).resolves.toEqual({ id: "class-a" });
    expect(database.classRoom.findFirst).toHaveBeenCalledWith({
      where: { id: "class-a", organizationId: "org-a" },
      select: { id: true },
    });
    await expect(
      assertClassAccess(
        context({ role: "TEACHER", authorizedClassIds: ["class-b"] }),
        "class-a",
      ),
    ).rejects.toThrow("Resource unavailable");
  });

  it("builds parent and teacher child ownership into the database query", async () => {
    database.child.findFirst.mockResolvedValue({ id: "child-a", classId: "class-a" });
    await assertChildAccess(context({ role: "PARENT", parentId: "parent-a" }), "child-a");
    expect(database.child.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: "child-a",
        organizationId: "org-a",
        parents: { some: { parentId: "parent-a" } },
      },
      select: { id: true, classId: true },
    });
    await assertChildAccess(
      context({ role: "TEACHER", authorizedClassIds: ["class-a"] }),
      "child-a",
    );
    expect(database.child.findFirst.mock.calls[1][0].where.classId).toEqual({
      in: ["class-a"],
    });
  });

  it("denies missing resources without revealing tenant existence", async () => {
    database.child.findFirst.mockResolvedValue(null);
    await expect(assertChildAccess(context(), "other-child")).rejects.toThrow(
      "Resource unavailable",
    );
  });

  it("requires an exact tenant parent-child relationship", async () => {
    database.parentChild.findFirst.mockResolvedValue({ parentId: "parent-a", childId: "child-a" });
    await assertParentChild(context(), "parent-a", "child-a");
    expect(database.parentChild.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: "org-a",
        parentId: "parent-a",
        childId: "child-a",
      },
    });
  });

  it("feature-gates complaints and limits parents to their own records", async () => {
    database.complaint.findFirst.mockResolvedValue({ id: "complaint-a" });
    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await assertComplaintAccess(parent, "complaint-a");
    expect(requireFeature).toHaveBeenCalledWith(parent, "advancedCommunication");
    expect(database.complaint.findFirst).toHaveBeenCalledWith({
      where: {
        id: "complaint-a",
        organizationId: "org-a",
        parentId: "parent-a",
      },
    });
  });

  it("limits parent payment access by authenticated parent identity", async () => {
    database.payment.findFirst.mockResolvedValue({ id: "payment-a" });
    await assertPaymentAccess(
      context({ role: "PARENT", parentId: "parent-a" }),
      "payment-a",
    );
    expect(database.payment.findFirst.mock.calls[0][0].where).toEqual({
      id: "payment-a",
      organizationId: "org-a",
      parentId: "parent-a",
    });
  });

  it("feature-gates homework and applies teacher and parent visibility scopes", async () => {
    database.homework.findFirst.mockResolvedValue({ id: "homework-a" });
    const teacher = context({ role: "TEACHER", authorizedClassIds: ["class-a"] });
    await assertHomeworkAccess(teacher, "homework-a");
    expect(requireFeature).toHaveBeenCalledWith(teacher, "homework");
    expect(database.homework.findFirst.mock.calls[0][0].where.classId).toEqual({
      in: ["class-a"],
    });

    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await assertHomeworkAccess(parent, "homework-a");
    const parentWhere = database.homework.findFirst.mock.calls[1][0].where;
    expect(parentWhere).toMatchObject({
      id: "homework-a",
      organizationId: "org-a",
      status: "PUBLISHED",
      active: true,
    });
    expect(parentWhere.OR).toHaveLength(2);
  });

  it("limits teacher activities to assigned classes or their own records", async () => {
    database.activity.findFirst.mockResolvedValue({ id: "activity-a" });
    await assertActivityAccess(
      context({ role: "TEACHER", authorizedClassIds: ["class-a"] }),
      "activity-a",
    );
    expect(database.activity.findFirst.mock.calls[0][0].where.OR).toEqual([
      { classId: { in: ["class-a"] } },
      { createdById: "user-a" },
    ]);

    await assertActivityAccess(
      context({ role: "PARENT", parentId: "parent-a" }),
      "activity-a",
    );
    expect(database.activity.findFirst.mock.calls[1][0].where.OR).toHaveLength(2);
    expect(database.activity.findFirst.mock.calls[1][0].where.OR[0]).toEqual({
      child: { parents: { some: { parentId: "parent-a" } } },
    });
  });
});
