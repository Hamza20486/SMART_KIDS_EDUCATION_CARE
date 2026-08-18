import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  child: { findMany: vi.fn(), findFirst: vi.fn() },
  attendance: { findMany: vi.fn(), findFirst: vi.fn() },
  complaint: { findMany: vi.fn(), findFirst: vi.fn() },
  payment: { findMany: vi.fn(), findFirst: vi.fn() },
  notificationDelivery: { findMany: vi.fn(), groupBy: vi.fn() },
  outboxEvent: { findMany: vi.fn() },
  organization: { findMany: vi.fn() },
  subscriptionPlan: { findMany: vi.fn() },
}));
const getOrganizationUsage = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: database }));
vi.mock("@/lib/auth", () => ({
  ForbiddenError: class ForbiddenError extends Error {},
}));
vi.mock("@/lib/subscriptions/service", () => ({ getOrganizationUsage }));

import { childrenRepository } from "@/lib/repositories/children";
import { attendanceRepository } from "@/lib/repositories/attendance";
import { complaintsRepository } from "@/lib/repositories/complaints";
import { paymentsRepository } from "@/lib/repositories/payments";
import { notificationsRepository } from "@/lib/repositories/notifications";
import { subscriptionsRepository } from "@/lib/repositories/subscriptions";
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

describe("tenant-scoped repositories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const delegate of Object.values(database)) {
      for (const method of Object.values(delegate)) method.mockResolvedValue([]);
    }
  });

  it("scopes children by parent ownership and rejects missing parent profiles", async () => {
    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await childrenRepository.list(parent);
    expect(database.child.findMany.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
      parents: { some: { parentId: "parent-a" } },
    });
    expect(() =>
      childrenRepository.list(context({ role: "PARENT", parentId: null })),
    ).toThrow("Parent profile missing");
  });

  it("scopes teacher children to assigned classes and denies inaccessible records", async () => {
    const teacher = context({ role: "TEACHER", authorizedClassIds: ["class-a"] });
    await childrenRepository.findAccessible(teacher, "child-a");
    expect(database.child.findFirst.mock.calls[0][0].where).toEqual({
      id: "child-a",
      organizationId: "org-a",
      classId: { in: ["class-a"] },
    });
    database.child.findFirst.mockResolvedValueOnce(null);
    await expect(childrenRepository.assertAccessible(teacher, "child-b")).rejects.toThrow(
      "Child unavailable",
    );
    database.child.findFirst.mockResolvedValueOnce({ id: "child-a", classId: "class-a" });
    await expect(
      childrenRepository.assertAccessible(teacher, "child-a"),
    ).resolves.toEqual({ id: "child-a", classId: "class-a" });
  });

  it("applies child ownership to attendance lists and details", async () => {
    const from = new Date("2026-08-01T00:00:00.000Z");
    const to = new Date("2026-08-31T23:59:59.999Z");
    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await attendanceRepository.list(parent, from, to);
    expect(database.attendance.findMany.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
      child: { parents: { some: { parentId: "parent-a" } } },
      date: { gte: from, lte: to },
    });
    await attendanceRepository.findAccessible(parent, "attendance-a");
    expect(database.attendance.findFirst.mock.calls[0][0].where.id).toBe("attendance-a");

    await attendanceRepository.list(
      context({ role: "TEACHER", authorizedClassIds: ["class-a"] }),
    );
    expect(database.attendance.findMany.mock.calls[1][0].where).toEqual({
      organizationId: "org-a",
      child: { classId: { in: ["class-a"] } },
    });
  });

  it("excludes internal complaint notes from parent repository reads", async () => {
    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await complaintsRepository.list(parent);
    const query = database.complaint.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ organizationId: "org-a", parentId: "parent-a" });
    expect(query.include.messages.where).toEqual({ internal: false });
    expect(query.include.parent).toBe(false);

    await complaintsRepository.list(context());
    expect(database.complaint.findMany.mock.calls[1][0].include.messages.where).toEqual({});
    await complaintsRepository.findAccessible(parent, "complaint-a");
    expect(database.complaint.findFirst.mock.calls[0][0]).toMatchObject({
      where: {
        id: "complaint-a",
        organizationId: "org-a",
        parentId: "parent-a",
      },
      include: { messages: { where: { internal: false } } },
    });
  });

  it("requires parent payment-view consent in every payment query", async () => {
    const parent = context({ role: "PARENT", parentId: "parent-a" });
    await paymentsRepository.findAccessible(parent, "payment-a");
    expect(database.payment.findFirst.mock.calls[0][0].where).toEqual({
      id: "payment-a",
      organizationId: "org-a",
      parentId: "parent-a",
      child: {
        parents: {
          some: { parentId: "parent-a", canViewPayments: true },
        },
      },
    });
    await paymentsRepository.list(context());
    expect(database.payment.findMany.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
    });
  });

  it("keeps notification delivery health queries inside the organization", async () => {
    database.notificationDelivery.findMany.mockResolvedValue([{ id: "delivery-a" }]);
    database.outboxEvent.findMany.mockResolvedValue([{ id: "event-a" }]);
    database.notificationDelivery.groupBy.mockResolvedValue([{ status: "FAILED", _count: { _all: 1 } }]);
    const result = await notificationsRepository.deliveryHealth(context());
    expect(result.deliveries).toHaveLength(1);
    expect(database.notificationDelivery.findMany.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
    });
    expect(database.outboxEvent.findMany.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
      status: "FAILED",
    });
    expect(database.notificationDelivery.groupBy.mock.calls[0][0].where).toEqual({
      organizationId: "org-a",
    });
  });

  it("builds platform subscription overviews without exposing the platform tenant", async () => {
    database.organization.findMany.mockResolvedValue([
      {
        id: "org-a",
        name: "School A",
        subscriptions: [{ id: "subscription-a", plan: { code: "PRO" } }],
      },
      { id: "org-b", name: "School B", subscriptions: [] },
    ]);
    database.subscriptionPlan.findMany.mockResolvedValue([{ code: "ESSENTIAL" }]);
    getOrganizationUsage.mockResolvedValue({ children: 12 });
    const result = await subscriptionsRepository.platformOverview();
    expect(database.organization.findMany.mock.calls[0][0].where).toEqual({
      slug: { not: "platform" },
    });
    expect(getOrganizationUsage).toHaveBeenCalledTimes(1);
    expect(result.organizations[0]).toMatchObject({
      id: "org-a",
      subscription: { id: "subscription-a" },
      usage: { children: 12 },
    });
    expect(result.organizations[1]).toMatchObject({
      id: "org-b",
      subscription: null,
      usage: null,
    });
  });
});
