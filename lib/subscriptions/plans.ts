import { z } from "zod";

export const PLAN_CODES = ["ESSENTIAL", "PRO", "PREMIUM"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

export const planEntitlementsSchema = z.object({
  maxChildren: z.number().int().positive(),
  maxStaff: z.number().int().positive(),
  storageMb: z.number().int().positive(),
  activityMedia: z.boolean(),
  homework: z.boolean(),
  advancedCommunication: z.boolean(),
  basicReports: z.boolean(),
  advancedReports: z.boolean(),
});

export type PlanEntitlements = z.infer<typeof planEntitlementsSchema>;
export type FeatureCode = keyof Pick<
  PlanEntitlements,
  | "activityMedia"
  | "homework"
  | "advancedCommunication"
  | "basicReports"
  | "advancedReports"
>;
export type LimitCode = "children" | "staff";

export const PLAN_ENTITLEMENTS: Record<PlanCode, PlanEntitlements> = {
  ESSENTIAL: {
    maxChildren: 100,
    maxStaff: 10,
    storageMb: 100,
    activityMedia: false,
    homework: false,
    advancedCommunication: false,
    basicReports: true,
    advancedReports: false,
  },
  PRO: {
    maxChildren: 300,
    maxStaff: 30,
    storageMb: 2_048,
    activityMedia: true,
    homework: true,
    advancedCommunication: true,
    basicReports: true,
    advancedReports: false,
  },
  PREMIUM: {
    maxChildren: 1_000,
    maxStaff: 100,
    storageMb: 10_240,
    activityMedia: true,
    homework: true,
    advancedCommunication: true,
    basicReports: true,
    advancedReports: true,
  },
};

export function parsePlanEntitlements(
  code: string,
  value: unknown,
): PlanEntitlements {
  const parsed = planEntitlementsSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  if (PLAN_CODES.includes(code as PlanCode)) return PLAN_ENTITLEMENTS[code as PlanCode];
  throw new Error(`Invalid entitlement configuration for plan ${code}`);
}

export function subscriptionIsUsable(
  subscription: {
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date;
  },
  now = new Date(),
) {
  if (subscription.status === "TRIAL") {
    return Boolean(subscription.trialEndsAt && subscription.trialEndsAt > now);
  }
  return subscription.status === "ACTIVE" && subscription.currentPeriodEnd > now;
}

export function nextMonthlyPeriodStart(currentEnd: Date, now = new Date()) {
  return currentEnd > now ? new Date(currentEnd) : now;
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function limitAllows(current: number, additional: number, maximum: number) {
  return current + additional <= maximum;
}
