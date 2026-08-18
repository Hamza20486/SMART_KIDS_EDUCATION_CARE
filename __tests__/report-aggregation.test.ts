import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  classRoom: { findMany: vi.fn() },
  child: { findMany: vi.fn(), count: vi.fn() },
  attendance: { findMany: vi.fn() },
  absenceRequest: { findMany: vi.fn() },
  activity: { findMany: vi.fn() },
  homework: { findMany: vi.fn() },
  complaint: { findMany: vi.fn() },
  payment: { findMany: vi.fn() },
  organization: { findMany: vi.fn() },
  user: { count: vi.fn() },
  invitationToken: { count: vi.fn() },
}));
const subscriptions = vi.hoisted(() => ({
  getOrganizationUsage: vi.fn(),
  storageUsageBytes: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: database }));
vi.mock("@/lib/subscriptions/service", () => subscriptions);

import { financialReport } from "@/lib/reports/financial";
import { operationalReport } from "@/lib/reports/operational";
import { platformReport } from "@/lib/reports/platform";

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-31T23:59:59.999Z");

describe("report aggregation boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aggregates finance while applying organization and class scope", async () => {
    database.payment.findMany.mockResolvedValue([
      {
        id: "pay-1",
        organizationId: "org-a",
        childId: "child-a",
        dueDate: new Date("2026-08-10T00:00:00.000Z"),
        status: "PARTIAL",
        grossAmountCentimes: 12_000,
        discountCentimes: 2_000,
        amountCentimes: 10_000,
        academicPeriod: "2026-08",
        reference: "PAY-1",
        child: {
          firstName: "Yasmine",
          lastName: "Alaoui",
          class: { name: "Petite section" },
        },
        parent: { firstName: "Sara", lastName: "Alaoui" },
        category: { name: "Scolarité" },
        transactions: [
          {
            amountCentimes: 4_000,
            method: "CASH",
            paidAt: new Date("2026-08-12T00:00:00.000Z"),
          },
        ],
        receipts: [
          {
            id: "receipt-1",
            receiptNumber: "REC-2026-000001",
            status: "VOID",
            issuedAt: new Date("2026-08-12T00:00:00.000Z"),
            voidedAt: new Date("2026-08-13T00:00:00.000Z"),
            reissuedFromId: null,
          },
          {
            id: "receipt-2",
            receiptNumber: "REC-2026-000002",
            status: "ISSUED",
            issuedAt: new Date("2026-08-13T00:00:00.000Z"),
            voidedAt: null,
            reissuedFromId: "receipt-1",
          },
        ],
      },
    ]);

    const report = await financialReport({
      organizationId: "org-a",
      classId: "class-a",
      from,
      to,
    });

    expect(database.payment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-a",
          child: { classId: "class-a" },
        },
      }),
    );
    expect(report.summary).toMatchObject({
      billedGrossCentimes: 12_000,
      discountsCentimes: 2_000,
      billedNetCentimes: 10_000,
      collectedCentimes: 4_000,
      currentOutstandingCentimes: 6_000,
      collectionRate: 40,
      partialPayments: 1,
      voidedReceipts: 1,
      reissuedReceipts: 1,
    });
    expect(report.revenueByMethod).toEqual([
      { method: "CASH", amountCentimes: 4_000 },
    ]);
    expect(report.receiptActivity).toHaveLength(2);
    expect(report.receiptActivity[0]).toMatchObject({
      receiptNumber: "REC-2026-000002",
      reissued: true,
    });
  });

  it("keeps operational queries tenant- and class-scoped", async () => {
    database.classRoom.findMany.mockResolvedValue([
      { id: "class-a", name: "Petite section", capacity: 2, active: true },
    ]);
    database.child.findMany.mockResolvedValue([
      {
        id: "child-a",
        firstName: "Yasmine",
        lastName: "Alaoui",
        classId: "class-a",
      },
    ]);
    database.attendance.findMany.mockResolvedValue([
      {
        id: "attendance-a",
        childId: "child-a",
        date: new Date("2026-08-10T00:00:00.000Z"),
        status: "ABSENT",
        arrivalAt: null,
        departureAt: null,
        pickupPerson: null,
        pickupAuthorization: null,
        note: null,
        child: {
          id: "child-a",
          firstName: "Yasmine",
          lastName: "Alaoui",
          classId: "class-a",
        },
      },
    ]);
    database.absenceRequest.findMany.mockResolvedValue([]);
    database.activity.findMany.mockResolvedValue([]);
    database.homework.findMany.mockResolvedValue([
      {
        id: "homework-a",
        title: "Coloriage",
        classId: "class-a",
        createdById: "teacher-a",
        dueDate: new Date("2026-08-15T00:00:00.000Z"),
        class: { name: "Petite section" },
        createdBy: { id: "teacher-a", name: "Mme Sara", role: "TEACHER" },
        assignments: [{ childId: "child-a" }],
        submissions: [
          { childId: "child-a", status: "SUBMITTED", submittedAt: from },
        ],
      },
    ]);
    database.complaint.findMany.mockResolvedValue([
      {
        id: "complaint-a",
        reference: "CMP-1",
        status: "RESOLVED",
        priority: "NORMAL",
        createdAt: new Date("2026-08-10T00:00:00.000Z"),
        resolvedAt: new Date("2026-08-11T00:00:00.000Z"),
        closedAt: null,
      },
    ]);

    const report = await operationalReport({
      organizationId: "org-a",
      from,
      to,
      authorizedClassIds: ["class-a"],
    });

    for (const delegate of [
      database.classRoom,
      database.child,
      database.attendance,
      database.absenceRequest,
      database.activity,
      database.homework,
      database.complaint,
    ]) {
      expect(delegate.findMany.mock.calls[0][0].where.organizationId).toBe("org-a");
    }
    expect(database.attendance.findMany.mock.calls[0][0].where.child).toEqual({
      classId: { in: ["class-a"] },
    });
    expect(report.summary).toMatchObject({
      attendanceRecords: 1,
      absenceRate: 100,
      homeworkCompletionRate: 100,
      averageComplaintResolutionHours: 24,
    });
    expect(report.attendanceByDate).toEqual([
      expect.objectContaining({ date: "2026-08-10", absenceRate: 100 }),
    ]);
    expect(report.classUtilization[0].utilizationRate).toBe(50);
  });

  it("aggregates platform plans, lifecycle states and usage", async () => {
    database.organization.findMany.mockResolvedValue([
      {
        id: "org-a",
        name: "École A",
        city: "Casablanca",
        active: true,
        subscriptions: [
          {
            status: "TRIAL",
            trialEndsAt: new Date("2026-08-25T00:00:00.000Z"),
            currentPeriodEnd: new Date("2026-09-25T00:00:00.000Z"),
            plan: { code: "PRO", name: "Pro" },
          },
        ],
      },
    ]);
    subscriptions.getOrganizationUsage.mockResolvedValue({
      children: 24,
      staff: 6,
      storageBytes: 1_048_576,
      limits: { children: 300, staff: 30, storageBytes: 2_147_483_648 },
    });

    const report = await platformReport(new Date("2026-08-17T00:00:00.000Z"));

    expect(database.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: { not: "platform" } } }),
    );
    expect(subscriptions.getOrganizationUsage).toHaveBeenCalledWith("org-a");
    expect(report.planCounts).toEqual({ PRO: 1 });
    expect(report.statusCounts).toEqual({ TRIAL: 1 });
    expect(report.summary).toMatchObject({
      organizations: 1,
      activeTrials: 1,
      expiringSoon: 1,
      totalChildren: 24,
      totalStaff: 6,
      totalStorageBytes: 1_048_576,
    });
  });

  it("includes actual usage for organizations without a configured plan", async () => {
    database.organization.findMany.mockResolvedValue([
      {
        id: "org-unconfigured",
        name: "New school",
        city: null,
        active: true,
        subscriptions: [],
      },
    ]);
    database.child.count.mockResolvedValue(3);
    database.user.count.mockResolvedValue(2);
    database.invitationToken.count.mockResolvedValue(1);
    subscriptions.storageUsageBytes.mockResolvedValue(4_096);
    const report = await platformReport(new Date("2026-08-17T00:00:00.000Z"));
    expect(report.planCounts).toEqual({ UNCONFIGURED: 1 });
    expect(report.statusCounts).toEqual({ UNCONFIGURED: 1 });
    expect(report.organizations[0]).toMatchObject({
      status: "UNCONFIGURED",
      children: 3,
      staff: 3,
      storageBytes: 4_096,
      childLimit: 0,
    });
  });

  it("rejects silently truncated operational reports", async () => {
    database.classRoom.findMany.mockResolvedValue([]);
    database.child.findMany.mockResolvedValue([]);
    database.attendance.findMany.mockResolvedValue(
      Array.from({ length: 20_001 }, () => ({})),
    );
    database.absenceRequest.findMany.mockResolvedValue([]);
    database.activity.findMany.mockResolvedValue([]);
    database.homework.findMany.mockResolvedValue([]);
    database.complaint.findMany.mockResolvedValue([]);
    await expect(
      operationalReport({ organizationId: "org-a", from, to }),
    ).rejects.toThrow("Report is too large");
  });

  it("rejects silently truncated financial and platform reports", async () => {
    database.payment.findMany.mockResolvedValue(
      Array.from({ length: 20_001 }, () => ({})),
    );
    await expect(
      financialReport({ organizationId: "org-a", from, to }),
    ).rejects.toThrow("Report is too large");

    database.organization.findMany.mockResolvedValue(
      Array.from({ length: 10_001 }, () => ({})),
    );
    await expect(platformReport()).rejects.toThrow("Platform report is too large");
  });
});
