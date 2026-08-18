import { prisma } from "../prisma";
import { getOrganizationUsage } from "../subscriptions/service";

export const subscriptionsRepository = {
  async platformOverview() {
    const [organizations, plans] = await Promise.all([
      prisma.organization.findMany({
        where: { slug: { not: "platform" } },
        include: {
          subscriptions: {
            include: {
              plan: true,
              events: { orderBy: { createdAt: "desc" }, take: 20 },
            },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: { priceCentimes: "asc" },
      }),
    ]);
    const rows = await Promise.all(
      organizations.map(async (organization) => {
        const subscription = organization.subscriptions[0] ?? null;
        const usage = subscription
          ? await getOrganizationUsage(organization.id)
          : null;
        return { ...organization, subscription, subscriptions: undefined, usage };
      }),
    );
    return { organizations: rows, plans };
  },
};
