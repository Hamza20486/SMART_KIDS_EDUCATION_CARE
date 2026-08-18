import { prisma } from "../prisma";
import { sendNotificationEmail } from "../email";
import {
  defaultChannelsFor,
  deliveryBackoffSeconds,
  deliveryChannels,
  notificationPayloadSchema,
} from "./catalog";

const OUTBOX_MAX_ATTEMPTS = 8;
const STALE_LOCK_MS = 5 * 60 * 1_000;

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown processing failure").slice(0, 500);
}

export async function recoverStaleNotificationWork(now = new Date()) {
  const stale = new Date(now.getTime() - STALE_LOCK_MS);
  const [events, deliveries] = await prisma.$transaction([
    prisma.outboxEvent.updateMany({
      where: { status: "PROCESSING", lockedAt: { lt: stale } },
      data: {
        status: "PENDING",
        lockedAt: null,
        lastError: "Recovered stale processing lock",
        availableAt: now,
      },
    }),
    prisma.notificationDelivery.updateMany({
      where: { status: "PROCESSING", lockedAt: { lt: stale } },
      data: {
        status: "RETRYING",
        lockedAt: null,
        lastError: "Recovered stale delivery lock",
        availableAt: now,
      },
    }),
  ]);
  return { events: events.count, deliveries: deliveries.count };
}

export async function processOutboxEvent(eventId: string) {
  const now = new Date();
  const claimed = await prisma.outboxEvent.updateMany({
    where: {
      id: eventId,
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: OUTBOX_MAX_ATTEMPTS },
      availableAt: { lte: now },
    },
    data: {
      status: "PROCESSING",
      lockedAt: now,
      attempts: { increment: 1 },
      lastError: null,
    },
  });
  if (!claimed.count) return { claimed: false, notifications: 0 };

  try {
    const event = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: eventId } });
    const payload = notificationPayloadSchema.parse(event.payload);
    const activeUsers = await prisma.user.findMany({
      where: {
        id: { in: payload.recipients },
        organizationId: event.organizationId,
        active: true,
        organization: { active: true },
      },
      select: { id: true },
    });
    const userIds = activeUsers.map((user) => user.id);
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        organizationId: event.organizationId,
        userId: { in: userIds },
        type: payload.notificationType,
      },
    });
    const preferenceByUser = new Map(preferences.map((item) => [item.userId, item]));

    const notifications = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const userId of userIds) {
        const preference = preferenceByUser.get(userId);
        const defaults = defaultChannelsFor(payload.notificationType);
        const channels = deliveryChannels({
          type: payload.notificationType,
          requested: payload.channels,
          inAppEnabled: preference?.inAppEnabled ?? defaults.includes("IN_APP"),
          emailEnabled: preference?.emailEnabled ?? defaults.includes("EMAIL"),
        });
        if (!channels.length) continue;

        const notification = await tx.notification.upsert({
          where: {
            organizationId_userId_eventKey: {
              organizationId: event.organizationId,
              userId,
              eventKey: event.eventKey,
            },
          },
          update: {},
          create: {
            organizationId: event.organizationId,
            userId,
            eventKey: event.eventKey,
            type: payload.notificationType,
            title: payload.title,
            message: payload.message,
            entityType: payload.entityType,
            entityId: payload.entityId,
          },
        });

        for (const channel of channels) {
          const deliveredInApp = channel === "IN_APP";
          await tx.notificationDelivery.upsert({
            where: {
              notificationId_channel: {
                notificationId: notification.id,
                channel,
              },
            },
            update: {},
            create: {
              organizationId: event.organizationId,
              notificationId: notification.id,
              channel,
              status: deliveredInApp ? "DELIVERED" : "QUEUED",
              sentAt: deliveredInApp ? now : null,
              deliveredAt: deliveredInApp ? now : null,
            },
          });
        }
        count += 1;
      }

      await tx.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: now,
          lockedAt: null,
          lastError: null,
        },
      });
      return count;
    });
    return { claimed: true, notifications };
  } catch (error) {
    const current = await prisma.outboxEvent.findUnique({
      where: { id: eventId },
      select: { attempts: true },
    });
    const attempts = current?.attempts ?? OUTBOX_MAX_ATTEMPTS;
    await prisma.outboxEvent.updateMany({
      where: { id: eventId, status: "PROCESSING" },
      data: {
        status: "FAILED",
        lockedAt: null,
        lastError: safeError(error),
        availableAt: new Date(Date.now() + deliveryBackoffSeconds(attempts) * 1_000),
      },
    });
    throw error;
  }
}

export async function processPendingOutboxEvents(limit = 50) {
  const rows = await prisma.outboxEvent.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: OUTBOX_MAX_ATTEMPTS },
      availableAt: { lte: new Date() },
    },
    select: { id: true },
    orderBy: { occurredAt: "asc" },
    take: limit,
  });
  let processed = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const result = await processOutboxEvent(row.id);
      if (result.claimed) processed += 1;
    } catch {
      failed += 1;
    }
  }
  return { found: rows.length, processed, failed };
}

async function deliverEmail(deliveryId: string) {
  const now = new Date();
  const claimed = await prisma.notificationDelivery.updateMany({
    where: {
      id: deliveryId,
      channel: "EMAIL",
      status: { in: ["QUEUED", "RETRYING"] },
      availableAt: { lte: now },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      lockedAt: now,
      lastError: null,
    },
  });
  if (!claimed.count) return "skipped" as const;

  const delivery = await prisma.notificationDelivery.findUniqueOrThrow({
    where: { id: deliveryId },
    include: {
      organization: { select: { name: true } },
      notification: {
        include: {
          user: { select: { email: true, name: true, active: true } },
        },
      },
    },
  });

  if (!delivery.notification.user.active || !delivery.notification.user.email) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "CANCELLED",
        lockedAt: null,
        lastError: "Recipient account is unavailable",
      },
    });
    return "cancelled" as const;
  }

  try {
    const providerMessageId = await sendNotificationEmail({
      to: delivery.notification.user.email,
      recipientName: delivery.notification.user.name,
      organizationName: delivery.organization.name,
      title: delivery.notification.title,
      message: delivery.notification.message,
    });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        providerMessageId,
        sentAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    });
    return "sent" as const;
  } catch (error) {
    const exhausted = delivery.attempts >= delivery.maxAttempts;
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "RETRYING",
        failedAt: exhausted ? new Date() : null,
        availableAt: new Date(
          Date.now() + deliveryBackoffSeconds(delivery.attempts) * 1_000,
        ),
        lockedAt: null,
        lastError: safeError(error),
      },
    });
    return exhausted ? ("failed" as const) : ("retrying" as const);
  }
}

export async function processPendingEmailDeliveries(limit = 50) {
  const rows = await prisma.notificationDelivery.findMany({
    where: {
      channel: "EMAIL",
      status: { in: ["QUEUED", "RETRYING"] },
      availableAt: { lte: new Date() },
      attempts: { lt: 5 },
    },
    select: { id: true },
    orderBy: { queuedAt: "asc" },
    take: limit,
  });
  const summary = { found: rows.length, sent: 0, retrying: 0, failed: 0, cancelled: 0 };
  for (const row of rows) {
    const result = await deliverEmail(row.id);
    if (result === "sent") summary.sent += 1;
    if (result === "retrying") summary.retrying += 1;
    if (result === "failed") summary.failed += 1;
    if (result === "cancelled") summary.cancelled += 1;
  }
  return summary;
}
