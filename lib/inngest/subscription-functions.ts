import { inngest } from "./client";
import { prisma } from "../prisma";
import { enqueueNotificationEvent } from "../notifications/outbox";
import {
  processOutboxEvent,
  processPendingEmailDeliveries,
} from "../notifications/processor";

export const subscriptionLifecycleSweep = inngest.createFunction(
  {
    id: "subscription-lifecycle-sweep",
    retries: 3,
    triggers: { cron: "30 5 * * *" },
  },
  async ({ step }) =>
    step.run("expire-subscriptions", async () => {
      const now = new Date();
      const rows = await prisma.subscription.findMany({
        where: {
          OR: [
            { status: "TRIAL", trialEndsAt: { lte: now } },
            { status: "ACTIVE", currentPeriodEnd: { lte: now } },
          ],
          organization: { active: true },
        },
        include: { plan: true },
      });
      const eventIds: string[] = [];
      let expired = 0;
      for (const row of rows) {
        const result = await prisma.$transaction(async (tx) => {
          const changed = await tx.subscription.updateMany({
            where: { id: row.id, status: row.status },
            data: { status: "PAST_DUE" },
          });
          if (!changed.count) return null;
          const action = row.status === "TRIAL" ? "TRIAL_EXPIRED" : "PERIOD_EXPIRED";
          await tx.subscriptionEvent.create({
            data: {
              organizationId: row.organizationId,
              subscriptionId: row.id,
              action,
              fromPlanCode: row.plan.code,
              toPlanCode: row.plan.code,
              fromStatus: row.status,
              toStatus: "PAST_DUE",
            },
          });
          await tx.auditLog.create({
            data: {
              organizationId: row.organizationId,
              action: `SUBSCRIPTION_${action}`,
              entity: "Subscription",
              entityId: row.id,
            },
          });
          const recipients = (
            await tx.user.findMany({
              where: {
                organizationId: row.organizationId,
                active: true,
                role: "ADMIN",
              },
              select: { id: true },
            })
          ).map((user) => user.id);
          if (!recipients.length) return { eventId: null as string | null };
          const event = await enqueueNotificationEvent(tx, {
            organizationId: row.organizationId,
            eventKey: `subscription-expired:${row.id}:${row.status === "TRIAL" ? row.trialEndsAt?.toISOString() : row.currentPeriodEnd.toISOString()}`,
            eventType: "subscription.expired",
            aggregateType: "Subscription",
            aggregateId: row.id,
            payload: {
              recipients,
              notificationType: "SUBSCRIPTION_STATUS",
              title: row.status === "TRIAL" ? "Période d'essai expirée" : "Abonnement expiré",
              message:
                "L'accès à l'organisation est suspendu. Contactez l'administrateur de la plateforme pour renouveler l'abonnement.",
              entityType: "Subscription",
              entityId: row.id,
              channels: ["IN_APP", "EMAIL"],
            },
          });
          return { eventId: event.id };
        });
        if (!result) continue;
        expired += 1;
        if (result.eventId) eventIds.push(result.eventId);
      }
      for (const eventId of eventIds) await processOutboxEvent(eventId);
      await processPendingEmailDeliveries(100);
      return { found: rows.length, expired, queued: eventIds.length };
    }),
);
