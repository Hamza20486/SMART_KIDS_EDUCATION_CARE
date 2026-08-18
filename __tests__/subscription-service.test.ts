import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import {
  assertCanAddChildren,
  assertCanAddStaff,
  getActiveSubscription,
  getConfiguredEntitlements,
  getOrganizationUsage,
  requireActiveSubscription,
  requireFeature,
  requirePlanLimit,
  requireStorageCapacity,
  storageUsageBytes,
} from "@/lib/subscriptions/service";
import { PLAN_ENTITLEMENTS } from "@/lib/subscriptions/plans";

function createReader() {
  return {
    subscription: { findFirst: vi.fn() },
    child: { count: vi.fn() },
    user: { count: vi.fn() },
    invitationToken: { count: vi.fn() },
    activityMedia: { aggregate: vi.fn() },
    homeworkAttachment: { aggregate: vi.fn() },
    homeworkSubmission: { aggregate: vi.fn() },
    absenceAttachment: { aggregate: vi.fn() },
    complaintAttachment: { aggregate: vi.fn() },
  };
}

function activeSubscription(features: unknown = PLAN_ENTITLEMENTS.PRO) {
  return {
    id: "subscription-a",
    status: "ACTIVE",
    trialEndsAt: null,
    currentPeriodEnd: new Date("2099-09-30T00:00:00.000Z"),
    plan: { code: "PRO", features },
  };
}

describe("subscription service", () => {
  let reader: ReturnType<typeof createReader>;

  beforeEach(() => {
    reader = createReader();
    reader.subscription.findFirst.mockResolvedValue(activeSubscription());
    reader.child.count.mockResolvedValue(0);
    reader.user.count.mockResolvedValue(0);
    reader.invitationToken.count.mockResolvedValue(0);
    reader.activityMedia.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });
    reader.homeworkAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });
    reader.homeworkSubmission.aggregate.mockResolvedValue({ _sum: { attachmentSize: null } });
    reader.absenceAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });
    reader.complaintAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: null } });
  });

  it("returns only currently usable subscriptions", async () => {
    await expect(
      getActiveSubscription("org-a", reader as never, new Date("2026-08-17T00:00:00Z")),
    ).resolves.toMatchObject({ id: "subscription-a" });
    reader.subscription.findFirst.mockResolvedValue({
      ...activeSubscription(),
      currentPeriodEnd: new Date("2026-08-16T00:00:00Z"),
    });
    await expect(
      getActiveSubscription("org-a", reader as never, new Date("2026-08-17T00:00:00Z")),
    ).resolves.toBeNull();
    expect(reader.subscription.findFirst).toHaveBeenCalledWith({
      where: { organizationId: "org-a" },
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("rejects missing or expired active subscriptions", async () => {
    reader.subscription.findFirst.mockResolvedValue(null);
    await expect(requireActiveSubscription("org-a", reader as never)).rejects.toThrow(
      "inactive or expired",
    );
  });

  it("parses configured entitlement data and rejects missing configuration", async () => {
    await expect(
      getConfiguredEntitlements("org-a", reader as never),
    ).resolves.toMatchObject({
      subscriptionId: "subscription-a",
      planCode: "PRO",
      entitlements: PLAN_ENTITLEMENTS.PRO,
    });
    reader.subscription.findFirst.mockResolvedValue(null);
    await expect(
      getConfiguredEntitlements("org-a", reader as never),
    ).rejects.toThrow("not configured");
  });

  it("keeps platform administrators outside school plan features", async () => {
    await expect(
      requireFeature(
        { organizationId: "platform", role: "SUPER_ADMIN" },
        "basicReports",
        reader as never,
      ),
    ).rejects.toThrow("do not inherit school features");
    expect(reader.subscription.findFirst).not.toHaveBeenCalled();
  });

  it("allows included features and denies excluded features", async () => {
    const identity = { organizationId: "org-a", role: "ADMIN" };
    await expect(
      requireFeature(identity, "homework", reader as never),
    ).resolves.toMatchObject({ planCode: "PRO" });
    reader.subscription.findFirst.mockResolvedValue(
      activeSubscription(PLAN_ENTITLEMENTS.ESSENTIAL),
    );
    await expect(
      requireFeature(identity, "homework", reader as never),
    ).rejects.toThrow("not included");
  });

  it("sums storage across every private attachment source", async () => {
    reader.activityMedia.aggregate.mockResolvedValue({ _sum: { sizeBytes: 10 } });
    reader.homeworkAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 20 } });
    reader.homeworkSubmission.aggregate.mockResolvedValue({ _sum: { attachmentSize: 30 } });
    reader.absenceAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 40 } });
    reader.complaintAttachment.aggregate.mockResolvedValue({ _sum: { sizeBytes: 50 } });
    await expect(storageUsageBytes("org-a", reader as never)).resolves.toBe(150);
    expect(reader.activityMedia.aggregate).toHaveBeenCalledWith({
      where: { organizationId: "org-a", deletedAt: null },
      _sum: { sizeBytes: true },
    });
  });

  it("reports active and pending staff against plan limits", async () => {
    reader.child.count.mockResolvedValue(24);
    reader.user.count.mockResolvedValue(5);
    reader.invitationToken.count.mockResolvedValue(2);
    reader.activityMedia.aggregate.mockResolvedValue({ _sum: { sizeBytes: 1_024 } });
    const usage = await getOrganizationUsage("org-a", reader as never);
    expect(usage).toMatchObject({
      children: 24,
      staff: 7,
      activeStaff: 5,
      pendingStaff: 2,
      storageBytes: 1_024,
      limits: {
        children: 300,
        staff: 30,
        storageBytes: 2_048 * 1_024 * 1_024,
      },
    });
    expect(reader.invitationToken.count.mock.calls[0][0].where).toMatchObject({
      organizationId: "org-a",
      usedAt: null,
    });
  });

  it("allows child capacity up to the limit and denies overflow", async () => {
    reader.child.count.mockResolvedValue(299);
    await expect(
      assertCanAddChildren("org-a", 1, reader as never),
    ).resolves.toEqual({ current: 299, maximum: 300 });
    reader.child.count.mockResolvedValue(300);
    await expect(
      requirePlanLimit(
        { organizationId: "org-a", role: "ADMIN" },
        "children",
        1,
        reader as never,
      ),
    ).rejects.toThrow("child limit");
  });

  it("includes pending invitations in staff capacity", async () => {
    reader.user.count.mockResolvedValue(29);
    reader.invitationToken.count.mockResolvedValue(1);
    await expect(assertCanAddStaff("org-a", 1, reader as never)).rejects.toThrow(
      "staff limit",
    );
    expect(reader.user.count.mock.calls[0][0].where.role.in).toEqual([
      "ADMIN",
      "MANAGER",
      "TEACHER",
      "ACCOUNTANT",
    ]);
  });

  it("checks projected storage against the configured byte limit", async () => {
    reader.subscription.findFirst.mockResolvedValue(
      activeSubscription({ ...PLAN_ENTITLEMENTS.PRO, storageMb: 1 }),
    );
    reader.activityMedia.aggregate.mockResolvedValue({
      _sum: { sizeBytes: 900_000 },
    });
    await expect(
      requireStorageCapacity("org-a", 100_000, reader as never),
    ).resolves.toEqual({ usedBytes: 900_000, limitBytes: 1_048_576 });
    await expect(
      requireStorageCapacity("org-a", 200_000, reader as never),
    ).rejects.toThrow("storage limit");
  });
});
