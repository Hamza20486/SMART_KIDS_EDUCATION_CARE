import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  authorizedClassIds: vi.fn(),
  assertClassAccess: vi.fn(),
  audit: vi.fn(),
  operationalReport: vi.fn(),
  financialReport: vi.fn(),
  platformReport: vi.fn(),
}));

vi.mock("@/lib/permissions", () => ({
  requirePermission: mocks.requirePermission,
  authorizedClassIds: mocks.authorizedClassIds,
}));
vi.mock("@/lib/policies", () => ({
  assertClassAccess: mocks.assertClassAccess,
}));
vi.mock("@/lib/audit", () => ({ audit: mocks.audit }));
vi.mock("@/lib/api", () => ({
  apiError: () => new Response("error", { status: 500 }),
}));
vi.mock("@/lib/reports/operational", () => ({
  operationalReport: mocks.operationalReport,
}));
vi.mock("@/lib/reports/financial", () => ({
  financialReport: mocks.financialReport,
}));
vi.mock("@/lib/reports/platform", () => ({
  platformReport: mocks.platformReport,
}));

import { GET } from "@/app/api/reports/export/route";

describe("audited report export route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enforces permission and class scope before auditing a safe export", async () => {
    const context = {
      id: "manager-a",
      role: "MANAGER",
      organizationId: "org-a",
    };
    mocks.requirePermission.mockResolvedValue(context);
    mocks.authorizedClassIds.mockResolvedValue(null);
    mocks.operationalReport.mockResolvedValue({
      summary: {
        attendanceRecords: 1,
        absenceRate: 0,
        lateRate: 0,
        absenceRequests: 0,
        homeworkCompletionRate: 0,
        complaints: 0,
        complaintsResolved: 0,
        averageComplaintResolutionHours: 0,
      },
      attendanceByDate: [],
      attendanceByClass: [],
      attendanceByChild: [],
      absenceRequests: [],
      teacherActivity: [],
      homeworkCompletion: [],
      pickupActivity: [],
      classUtilization: [],
      exportRows: [
        {
          date: new Date("2026-08-10T00:00:00.000Z"),
          child: "Yasmine Alaoui",
          className: "Petite section",
          status: "PRESENT",
          arrivalAt: null,
          departureAt: null,
          pickup: "",
          note: "=unsafe",
        },
      ],
    });

    const response = await GET(
      new Request(
        "https://example.test/api/reports/export?kind=operational&format=csv&from=2026-08-01&to=2026-08-31&classId=class-a&locale=en",
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(await response.text()).toContain("'=unsafe");
    expect(mocks.requirePermission).toHaveBeenCalledWith("reports.operational");
    expect(mocks.assertClassAccess).toHaveBeenCalledWith(context, "class-a");
    expect(mocks.operationalReport).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        classId: "class-a",
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      context,
      "EXPORT",
      "Report",
      "operational",
      {
        format: "csv",
        count: 7,
        classId: "class-a",
        from: "2026-08-01",
        to: "2026-08-31",
      },
    );
  });

  it("keeps financial exports tenant/class scoped and audited", async () => {
    const context = {
      id: "accountant-a",
      role: "ACCOUNTANT",
      organizationId: "org-a",
    };
    mocks.requirePermission.mockResolvedValue(context);
    mocks.financialReport.mockResolvedValue({
      summary: {
        billedGrossCentimes: 10_000,
        discountsCentimes: 0,
        billedNetCentimes: 10_000,
        collectedCentimes: 10_000,
        currentOutstandingCentimes: 0,
        transactions: 1,
        partialPayments: 0,
        voidedReceipts: 0,
        reissuedReceipts: 0,
      },
      statusCounts: { PAID: 1 },
      revenueByMonth: [],
      revenueByMethod: [],
      outstandingByChild: [],
      outstandingByClass: [],
      receiptActivity: [],
      exportRows: [
        {
          child: "Yasmine Alaoui",
          parent: "Sara Alaoui",
          className: "Petite section",
          category: "Scolarité",
          academicPeriod: "2026-08",
          grossCentimes: 10_000,
          discountCentimes: 0,
          netCentimes: 10_000,
          paidCentimes: 10_000,
          outstandingCentimes: 0,
          dueDate: new Date("2026-08-10T00:00:00.000Z"),
          status: "PAID",
          reference: "PAY-1",
        },
      ],
    });

    const response = await GET(
      new Request(
        "https://example.test/api/reports/export?kind=financial&format=csv&from=2026-08-01&to=2026-08-31&classId=class-a&locale=en",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith("reports.financial");
    expect(mocks.assertClassAccess).toHaveBeenCalledWith(context, "class-a");
    expect(mocks.financialReport).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-a",
        classId: "class-a",
      }),
    );
    expect(mocks.audit).toHaveBeenCalledWith(
      context,
      "EXPORT",
      "Report",
      "financial",
      {
        format: "csv",
        count: 10,
        classId: "class-a",
        from: "2026-08-01",
        to: "2026-08-31",
      },
    );
  });
});
