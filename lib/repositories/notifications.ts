import { prisma } from "../prisma";
import type { AuthContext } from "../auth-context";

export const notificationsRepository = {
  async deliveryHealth(context: AuthContext) {
    const [deliveries, failedEvents, statusCounts] = await Promise.all([
      prisma.notificationDelivery.findMany({
        where: { organizationId: context.organizationId },
        include: {
          notification: {
            select: {
              type: true,
              title: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.outboxEvent.findMany({
        where: {
          organizationId: context.organizationId,
          status: "FAILED",
        },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
      prisma.notificationDelivery.groupBy({
        by: ["status"],
        where: { organizationId: context.organizationId },
        _count: { _all: true },
      }),
    ]);
    return { deliveries, failedEvents, statusCounts };
  },
};
