import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { ForbiddenError } from "../errors";
import type { Permission } from "../permission-map";
import {
  limitAllows,
  parsePlanEntitlements,
  subscriptionIsUsable,
  type FeatureCode,
  type PlanEntitlements,
} from "./plans";

type SubscriptionReader = Pick<
  Prisma.TransactionClient,
  | "subscription"
  | "child"
  | "user"
  | "invitationToken"
  | "activityMedia"
  | "homeworkAttachment"
  | "homeworkSubmission"
  | "absenceAttachment"
  | "complaintAttachment"
>;

type TenantIdentity = { organizationId: string; role: string };

export const featureForPermission: Partial<Record<Permission, FeatureCode>> = {
  "activities.media_manage": "activityMedia",
  "homework.read": "homework",
  "homework.create": "homework",
  "homework.update": "homework",
  "homework.review_submission": "homework",
  "complaints.read": "advancedCommunication",
  "complaints.create": "advancedCommunication",
  "complaints.respond": "advancedCommunication",
  "complaints.internal_note": "advancedCommunication",
  "complaints.assign": "advancedCommunication",
  "reports.operational": "basicReports",
  "reports.financial": "basicReports",
};

export async function getLatestSubscription(
  organizationId: string,
  reader: SubscriptionReader = prisma,
) {
  return reader.subscription.findFirst({
    where: { organizationId },
    include: { plan: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getActiveSubscription(
  organizationId: string,
  reader: SubscriptionReader = prisma,
  now = new Date(),
) {
  const subscription = await getLatestSubscription(organizationId, reader);
  if (!subscription || !subscriptionIsUsable(subscription, now)) return null;
  return subscription;
}

export async function requireActiveSubscription(
  organizationId: string,
  reader: SubscriptionReader = prisma,
) {
  const subscription = await getActiveSubscription(organizationId, reader);
  if (!subscription) throw new ForbiddenError("Organization subscription inactive or expired");
  return subscription;
}

export async function getConfiguredEntitlements(
  organizationId: string,
  reader: SubscriptionReader = prisma,
): Promise<{ subscriptionId: string; planCode: string; entitlements: PlanEntitlements }> {
  const subscription = await getLatestSubscription(organizationId, reader);
  if (!subscription) throw new ForbiddenError("Organization subscription is not configured");
  return {
    subscriptionId: subscription.id,
    planCode: subscription.plan.code,
    entitlements: parsePlanEntitlements(subscription.plan.code, subscription.plan.features),
  };
}

export async function getEntitlements(
  organizationId: string,
  reader: SubscriptionReader = prisma,
): Promise<{ subscriptionId: string; planCode: string; entitlements: PlanEntitlements }> {
  const subscription = await requireActiveSubscription(organizationId, reader);
  return {
    subscriptionId: subscription.id,
    planCode: subscription.plan.code,
    entitlements: parsePlanEntitlements(subscription.plan.code, subscription.plan.features),
  };
}

export async function requireFeature(
  identity: TenantIdentity,
  feature: FeatureCode,
  reader: SubscriptionReader = prisma,
) {
  if (identity.role === "SUPER_ADMIN") {
    throw new ForbiddenError("Platform administrators do not inherit school features");
  }
  const access = await getEntitlements(identity.organizationId, reader);
  if (!access.entitlements[feature]) {
    throw new ForbiddenError(`Feature ${feature} is not included in this subscription plan`);
  }
  return access;
}

export async function storageUsageBytes(
  organizationId: string,
  reader: SubscriptionReader = prisma,
) {
  const [media, homework, submissions, absences, complaints] = await Promise.all([
    reader.activityMedia.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
    reader.homeworkAttachment.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
    reader.homeworkSubmission.aggregate({
      where: { organizationId },
      _sum: { attachmentSize: true },
    }),
    reader.absenceAttachment.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
    reader.complaintAttachment.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { sizeBytes: true },
    }),
  ]);
  return (
    (media._sum.sizeBytes ?? 0) +
    (homework._sum.sizeBytes ?? 0) +
    (submissions._sum.attachmentSize ?? 0) +
    (absences._sum.sizeBytes ?? 0) +
    (complaints._sum.sizeBytes ?? 0)
  );
}

export async function getOrganizationUsage(
  organizationId: string,
  reader: SubscriptionReader = prisma,
) {
  const [
    { entitlements, planCode, subscriptionId },
    children,
    activeStaff,
    pendingStaff,
    storageBytes,
  ] = await Promise.all([
    getConfiguredEntitlements(organizationId, reader),
    reader.child.count({ where: { organizationId, active: true } }),
    reader.user.count({
      where: {
        organizationId,
        active: true,
        role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
      },
    }),
    reader.invitationToken.count({
      where: {
        organizationId,
        role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
    storageUsageBytes(organizationId, reader),
  ]);
  return {
    subscriptionId,
    planCode,
    children,
    staff: activeStaff + pendingStaff,
    activeStaff,
    pendingStaff,
    storageBytes,
    limits: {
      children: entitlements.maxChildren,
      staff: entitlements.maxStaff,
      storageBytes: entitlements.storageMb * 1_024 * 1_024,
    },
    entitlements,
  };
}

export async function assertCanAddChildren(
  organizationId: string,
  additional = 1,
  reader: SubscriptionReader = prisma,
) {
  const [{ entitlements }, current] = await Promise.all([
    getEntitlements(organizationId, reader),
    reader.child.count({ where: { organizationId, active: true } }),
  ]);
  if (!limitAllows(current, additional, entitlements.maxChildren)) {
    throw new ForbiddenError("The subscription child limit has been reached");
  }
  return { current, maximum: entitlements.maxChildren };
}

export async function assertCanAddStaff(
  organizationId: string,
  additional = 1,
  reader: SubscriptionReader = prisma,
) {
  const now = new Date();
  const [{ entitlements }, active, pending] = await Promise.all([
    getEntitlements(organizationId, reader),
    reader.user.count({
      where: {
        organizationId,
        active: true,
        role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
      },
    }),
    reader.invitationToken.count({
      where: {
        organizationId,
        role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
        usedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);
  const current = active + pending;
  if (!limitAllows(current, additional, entitlements.maxStaff)) {
    throw new ForbiddenError("The subscription staff limit has been reached");
  }
  return { current, maximum: entitlements.maxStaff };
}

export async function requirePlanLimit(
  identity: TenantIdentity,
  limit: "children" | "staff",
  additional = 1,
  reader: SubscriptionReader = prisma,
) {
  return limit === "children"
    ? assertCanAddChildren(identity.organizationId, additional, reader)
    : assertCanAddStaff(identity.organizationId, additional, reader);
}

export async function requireStorageCapacity(
  organizationId: string,
  additionalBytes: number,
  reader: SubscriptionReader = prisma,
) {
  const [{ entitlements }, usedBytes] = await Promise.all([
    getEntitlements(organizationId, reader),
    storageUsageBytes(organizationId, reader),
  ]);
  const limitBytes = entitlements.storageMb * 1_024 * 1_024;
  if (usedBytes + additionalBytes > limitBytes) {
    throw new ForbiddenError("The subscription storage limit has been reached");
  }
  return { usedBytes, limitBytes };
}
