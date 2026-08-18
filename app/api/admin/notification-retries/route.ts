import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const retrySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("delivery"), id: z.string() }),
  z.object({ kind: z.literal("outbox"), id: z.string() }),
]);

export async function POST(request: Request) {
  try {
    const user = await requirePermission("settings.manage");
    const input = retrySchema.parse(await request.json());
    let outboxEventId: string | null = null;
    const updated = await prisma.$transaction(async (tx) => {
      const result =
        input.kind === "delivery"
          ? await tx.notificationDelivery.updateMany({
              where: {
                id: input.id,
                organizationId: user.organizationId,
                status: "FAILED",
              },
              data: {
                status: "RETRYING",
                attempts: 0,
                availableAt: new Date(),
                failedAt: null,
                lastError: null,
              },
            })
          : await tx.outboxEvent.updateMany({
              where: {
                id: input.id,
                organizationId: user.organizationId,
                status: "FAILED",
              },
              data: {
                status: "PENDING",
                attempts: 0,
                availableAt: new Date(),
                processedAt: null,
                lastError: null,
              },
            });
      if (!result.count) throw new Error("Not found");
      if (input.kind === "outbox") outboxEventId = input.id;
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "NOTIFICATION_RETRY",
          entity: input.kind === "delivery" ? "NotificationDelivery" : "OutboxEvent",
          entityId: input.id,
        },
      });
      return result.count;
    });
    if (outboxEventId) await wakeNotificationWorker(outboxEventId);
    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    return apiError(error);
  }
}
