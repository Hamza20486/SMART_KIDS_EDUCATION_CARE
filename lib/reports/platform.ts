import { prisma } from "../prisma";
import { BadRequestError } from "../errors";
import {
  getOrganizationUsage,
  storageUsageBytes,
} from "../subscriptions/service";

type PlatformOrganization = {
  id: string;
  name: string;
  city: string | null;
  active: boolean;
  subscriptions: Array<{
    status: string;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    plan: { code: string; name: string };
  }>;
};

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    results.push(...(await Promise.all(items.slice(index, index + batchSize).map(mapper))));
  }
  return results;
}

export async function platformReport(now = new Date()) {
  const organizations = (await prisma.organization.findMany({
    where: { slug: { not: "platform" } },
    include: {
      subscriptions: {
        include: { plan: true },
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
    take: 10_001,
  })) as PlatformOrganization[];
  if (organizations.length > 10_000) {
    throw new BadRequestError("Platform report is too large");
  }
  const expiringAt = new Date(now.getTime() + 14 * 86_400_000);
  const planCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const rows = await mapInBatches(
    organizations,
    20,
    async (organization) => {
      const subscription = organization.subscriptions[0] ?? null;
      if (subscription) {
        planCounts[subscription.plan.code] = (planCounts[subscription.plan.code] ?? 0) + 1;
        statusCounts[subscription.status] = (statusCounts[subscription.status] ?? 0) + 1;
      } else {
        planCounts.UNCONFIGURED = (planCounts.UNCONFIGURED ?? 0) + 1;
        statusCounts.UNCONFIGURED = (statusCounts.UNCONFIGURED ?? 0) + 1;
      }
      const usage = subscription
        ? await getOrganizationUsage(organization.id)
        : await (async () => {
            const [children, activeStaff, pendingStaff, storageBytes] = await Promise.all([
              prisma.child.count({
                where: { organizationId: organization.id, active: true },
              }),
              prisma.user.count({
                where: {
                  organizationId: organization.id,
                  active: true,
                  role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
                },
              }),
              prisma.invitationToken.count({
                where: {
                  organizationId: organization.id,
                  role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] },
                  usedAt: null,
                  expiresAt: { gt: now },
                },
              }),
              storageUsageBytes(organization.id),
            ]);
            return {
              children,
              staff: activeStaff + pendingStaff,
              storageBytes,
              limits: { children: 0, staff: 0, storageBytes: 0 },
            };
          })();
      const effectiveEnd =
        subscription?.status === "TRIAL"
          ? subscription.trialEndsAt
          : subscription?.currentPeriodEnd;
      return {
        id: organization.id,
        name: organization.name,
        city: organization.city,
        active: organization.active,
        planCode: subscription?.plan.code ?? null,
        planName: subscription?.plan.name ?? null,
        status: subscription?.status ?? "UNCONFIGURED",
        trialEndsAt: subscription?.trialEndsAt ?? null,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
        expiringSoon: Boolean(
          effectiveEnd && effectiveEnd > now && effectiveEnd <= expiringAt,
        ),
        children: usage?.children ?? 0,
        staff: usage?.staff ?? 0,
        storageBytes: usage?.storageBytes ?? 0,
        childLimit: usage?.limits.children ?? 0,
        staffLimit: usage?.limits.staff ?? 0,
        storageLimitBytes: usage?.limits.storageBytes ?? 0,
      };
    },
  );
  return {
    summary: {
      organizations: organizations.length,
      activeOrganizations: organizations.filter((organization) => organization.active).length,
      activeTrials: rows.filter((row) => row.status === "TRIAL").length,
      expiringSoon: rows.filter((row) => row.expiringSoon).length,
      suspended: rows.filter((row) => row.status === "SUSPENDED").length,
      totalChildren: rows.reduce((total, row) => total + row.children, 0),
      totalStaff: rows.reduce((total, row) => total + row.staff, 0),
      totalStorageBytes: rows.reduce((total, row) => total + row.storageBytes, 0),
    },
    planCounts,
    statusCounts,
    organizations: rows,
  };
}
