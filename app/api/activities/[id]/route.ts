import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import {
  assertActivityAccess,
  assertChildAccess,
  assertClassAccess,
} from "@/lib/policies";
import { activityHasConsent } from "@/lib/media-security";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const updateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(2).max(2_000).optional(),
  activityDate: z.coerce.date().optional(),
  classId: z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional()),
  childId: z.preprocess((value) => (value === "" ? null : value), z.string().nullable().optional()),
  visibleToParents: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : value),
    z.boolean().optional(),
  ),
  active: z.preprocess(
    (value) => (value === "true" ? true : value === "false" ? false : value),
    z.boolean().optional(),
  ),
});

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("activities.read");
    const { id } = await params;
    await assertActivityAccess(user, id);
    return NextResponse.json(
      await prisma.activity.findFirst({
        where: { id, organizationId: user.organizationId },
        include: {
          class: true,
          child: true,
          media: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
          createdBy: { select: { name: true } },
        },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("activities.update");
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const current = await assertActivityAccess(user, id);
    if (input.classId) await assertClassAccess(user, input.classId);
    if (input.childId) await assertChildAccess(user, input.childId);
    const target = {
      classId: input.classId === undefined ? current.classId : input.classId,
      childId: input.childId === undefined ? current.childId : input.childId,
    };
    if (
      input.visibleToParents &&
      (await prisma.activityMedia.count({
        where: { organizationId: user.organizationId, activityId: id, deletedAt: null },
      })) > 0 &&
      !(await activityHasConsent(user.organizationId, target))
    ) {
      return NextResponse.json(
        { error: "Media consent is required for every affected child" },
        { status: 409 },
      );
    }

    const newlyPublished = input.visibleToParents === true && !current.visibleToParents;
    const result = await prisma.$transaction(async (tx) => {
      const publishedAt = newlyPublished
        ? new Date()
        : input.visibleToParents === false
          ? null
          : undefined;
      const row = await tx.activity.update({
        where: { id },
        data: { ...input, publishedAt },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "UPDATE",
          entity: "Activity",
          entityId: id,
        },
      });
      let eventId: string | null = null;
      if (newlyPublished && row.publishedAt) {
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
            eventKey: `activity-published:${row.id}:${row.publishedAt.toISOString()}`,
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
      return { eventId };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("activities.archive");
    const { id } = await params;
    await assertActivityAccess(user, id);
    await prisma.activity.update({
      where: { id },
      data: { active: false, visibleToParents: false },
    });
    await audit(user, "ARCHIVE", "Activity", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
