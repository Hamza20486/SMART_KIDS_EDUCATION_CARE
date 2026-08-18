import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedClassIds, requirePermission } from "@/lib/permissions";
import { activitySchema } from "@/lib/validation";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

export async function GET() {
  try {
    const user = await requirePermission("activities.read");
    const classIds = await authorizedClassIds(user);
    return NextResponse.json(
      await prisma.activity.findMany({
        where: {
          organizationId: user.organizationId,
          ...(classIds
            ? { OR: [{ classId: { in: classIds } }, { createdById: user.id }] }
            : {}),
        },
        include: { class: true, child: true, _count: { select: { media: true } } },
        orderBy: { activityDate: "desc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("activities.create");
    const input = activitySchema.parse(await request.json());
    const authorizedClasses = await authorizedClassIds(user);
    if (authorizedClasses && (!input.classId || !authorizedClasses.includes(input.classId))) {
      throw new Error("Not found");
    }
    if (
      input.classId &&
      !(await prisma.classRoom.findFirst({
        where: { id: input.classId, organizationId: user.organizationId },
      }))
    ) {
      throw new Error("Not found");
    }
    if (
      input.childId &&
      !(await prisma.child.findFirst({
        where: {
          id: input.childId,
          organizationId: user.organizationId,
          ...(authorizedClasses ? { classId: { in: authorizedClasses } } : {}),
        },
      }))
    ) {
      throw new Error("Not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const publishedAt = input.visibleToParents ? new Date() : null;
      const row = await tx.activity.create({
        data: {
          ...input,
          organizationId: user.organizationId,
          createdById: user.id,
          publishedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "CREATE",
          entity: "Activity",
          entityId: row.id,
        },
      });
      let eventId: string | null = null;
      if (row.visibleToParents) {
        const childIds = row.childId
          ? [row.childId]
          : row.classId
            ? (
                await tx.child.findMany({
                  where: {
                    organizationId: user.organizationId,
                    classId: row.classId,
                    active: true,
                  },
                  select: { id: true },
                })
              ).map((child) => child.id)
            : [];
        const recipients = await parentUserIdsForChildren(
          tx,
          user.organizationId,
          childIds,
        );
        if (recipients.length) {
          const event = await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `activity-published:${row.id}:${publishedAt!.toISOString()}`,
            eventType: "activity.published",
            aggregateType: "Activity",
            aggregateId: row.id,
            payload: {
              recipients,
              notificationType: "ACTIVITY_PUBLISHED",
              title: `Nouvelle activité : ${row.title}`,
              message: row.description.slice(0, 500),
              entityType: "Activity",
              entityId: row.id,
            },
          });
          eventId = event.id;
        }
      }
      return { row, eventId };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json(result.row, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
