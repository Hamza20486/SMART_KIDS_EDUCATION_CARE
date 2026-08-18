import type { Prisma } from "@prisma/client";
import {
  notificationPayloadSchema,
  type NotificationPayload,
} from "./catalog";

export type NotificationEventInput = {
  organizationId: string;
  eventKey: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: NotificationPayload;
  availableAt?: Date;
};

type OutboxWriter = Pick<Prisma.TransactionClient, "outboxEvent">;

/**
 * Writes an idempotent event in the same transaction as the business change.
 * A duplicate eventKey is intentionally a no-op.
 */
export async function enqueueNotificationEvent(
  tx: OutboxWriter,
  input: NotificationEventInput,
) {
  const payload = notificationPayloadSchema.parse(input.payload);
  return tx.outboxEvent.upsert({
    where: { eventKey: input.eventKey },
    update: {},
    create: {
      organizationId: input.organizationId,
      eventKey: input.eventKey,
      type: input.eventType,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      payload: payload as Prisma.InputJsonValue,
      availableAt: input.availableAt,
    },
    select: { id: true, status: true },
  });
}
