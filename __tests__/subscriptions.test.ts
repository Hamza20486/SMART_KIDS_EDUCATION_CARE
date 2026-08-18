import { describe, expect, it } from "vitest";
import {
  PLAN_ENTITLEMENTS,
  addMonths,
  limitAllows,
  nextMonthlyPeriodStart,
  parsePlanEntitlements,
  subscriptionIsUsable,
} from "@/lib/subscriptions/plans";

describe("subscription entitlements", () => {
  it("defines increasing limits for the three plans", () => {
    expect(PLAN_ENTITLEMENTS.ESSENTIAL.maxChildren).toBeLessThan(
      PLAN_ENTITLEMENTS.PRO.maxChildren,
    );
    expect(PLAN_ENTITLEMENTS.PRO.maxChildren).toBeLessThan(
      PLAN_ENTITLEMENTS.PREMIUM.maxChildren,
    );
    expect(PLAN_ENTITLEMENTS.ESSENTIAL.activityMedia).toBe(false);
    expect(PLAN_ENTITLEMENTS.PRO.activityMedia).toBe(true);
    expect(PLAN_ENTITLEMENTS.PREMIUM.advancedReports).toBe(true);
  });

  it("falls back to the versioned contract for legacy seeded JSON", () => {
    expect(parsePlanEntitlements("PRO", { media: true }).homework).toBe(true);
  });

  it("enforces trial and active period expiry", () => {
    const now = new Date("2026-08-17T00:00:00Z");
    expect(
      subscriptionIsUsable(
        {
          status: "TRIAL",
          trialEndsAt: new Date("2026-08-18T00:00:00Z"),
          currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
        },
        now,
      ),
    ).toBe(true);
    expect(
      subscriptionIsUsable(
        {
          status: "TRIAL",
          trialEndsAt: new Date("2026-08-16T00:00:00Z"),
          currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
    expect(
      subscriptionIsUsable(
        {
          status: "ACTIVE",
          trialEndsAt: null,
          currentPeriodEnd: new Date("2026-08-16T00:00:00Z"),
        },
        now,
      ),
    ).toBe(false);
  });

  it("checks projected usage and uses calendar-month renewal", () => {
    expect(limitAllows(9, 1, 10)).toBe(true);
    expect(limitAllows(10, 1, 10)).toBe(false);
    const renewed = addMonths(new Date("2026-01-31T00:00:00Z"), 1);
    expect(renewed.getUTCMonth()).toBe(1);
    expect(renewed.getUTCDate()).toBe(28);
  });

  it("accepts a complete custom entitlement contract", () => {
    const custom = { ...PLAN_ENTITLEMENTS.PRO, maxChildren: 450 };
    expect(parsePlanEntitlements("CUSTOM", custom)).toEqual(custom);
    expect(() => parsePlanEntitlements("CUSTOM", { maxChildren: 10 })).toThrow(
      "Invalid entitlement configuration",
    );
  });

  it("rejects unusable lifecycle states and missing trial ends", () => {
    const future = new Date("2026-09-01T00:00:00Z");
    const now = new Date("2026-08-17T00:00:00Z");
    expect(
      subscriptionIsUsable(
        { status: "TRIAL", trialEndsAt: null, currentPeriodEnd: future },
        now,
      ),
    ).toBe(false);
    expect(
      subscriptionIsUsable(
        { status: "SUSPENDED", trialEndsAt: null, currentPeriodEnd: future },
        now,
      ),
    ).toBe(false);
  });

  it("starts renewal after the later of current period end and now", () => {
    const now = new Date("2026-08-17T00:00:00Z");
    const future = new Date("2026-09-01T00:00:00Z");
    expect(nextMonthlyPeriodStart(future, now)).toEqual(future);
    expect(nextMonthlyPeriodStart(new Date("2026-08-01T00:00:00Z"), now)).toBe(now);
  });

  it("handles leap years and multi-month changes", () => {
    expect(addMonths(new Date("2024-01-31T00:00:00Z"), 1).toISOString()).toBe(
      "2024-02-29T00:00:00.000Z",
    );
    expect(addMonths(new Date("2026-11-30T00:00:00Z"), 3).toISOString()).toBe(
      "2027-02-28T00:00:00.000Z",
    );
  });
});
