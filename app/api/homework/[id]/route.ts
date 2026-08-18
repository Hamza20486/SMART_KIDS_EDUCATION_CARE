import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { assertClassAccess, assertHomeworkAccess } from "@/lib/policies";
import {
  scheduleHomeworkReminder,
  wakeNotificationWorker,
} from "@/lib/inngest/client";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";

const updateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  description: z.string().min(2).max(2_000).optional(),
  dueDate: z.coerce.date().optional(),
  classId: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
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
    const user = await requirePermission("homework.read");
    const { id } = await params;
    await assertHomeworkAccess(user, id);
    return NextResponse.json(
      await prisma.homework.findUnique({
        where: { id },
        include: {
          class: true,
          attachments: { where: { deletedAt: null } },
          assignments: { include: { child: true } },
          submissions: {
            include: { child: true, reviewedBy: { select: { name: true } } },
            orderBy: { submittedAt: "desc" },
          },
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
    const user = await requirePermission("homework.update");
    const { id } = await params;
    const input = updateSchema.parse(await request.json());
    const current = await assertHomeworkAccess(user, id);
    if (input.classId) await assertClassAccess(user, input.classId);
    const newlyPublished = input.status === "PUBLISHED" && current.status !== "PUBLISHED";

    const result = await prisma.$transaction(async (tx) => {
      const row = await tx.homework.update({
        where: { id },
        data: {
          ...input,
          publishedAt:
            input.status === "PUBLISHED"
              ? new Date()
              : input.status === "DRAFT"
                ? null
                : undefined,
        },
      });
      let eventId: string | null = null;
      if (newlyPublished) {
        const assignments = await tx.homeworkAssignment.findMany({
          where: { organizationId: user.organizationId, homeworkId: id, required: true },
          select: { childId: true },
        });
        const childIds = assignments.length
          ? assignments.map((assignment) => assignment.childId)
          : (
              await tx.child.findMany({
                where: {
                  organizationId: user.organizationId,
                  classId: row.classId,
                  active: true,
                },
                select: { id: true },
              })
            ).map((child) => child.id);
        const recipients = await parentUserIdsForChildren(
          tx,
          user.organizationId,
          childIds,
        );
        if (recipients.length) {
          const event = await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `homework-published:${row.id}:${row.publishedAt!.toISOString()}`,
            eventType: "homework.published",
            aggregateType: "Homework",
            aggregateId: row.id,
            payload: {
              recipients,
              notificationType: "HOMEWORK_PUBLISHED",
              title: `Nouveau devoir : ${row.title}`,
              message: `Échéance : ${row.dueDate.toLocaleDateString("fr-MA")}`,
              entityType: "Homework",
              entityId: row.id,
            },
          });
          eventId = event.id;
        }
      }
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "UPDATE",
          entity: "Homework",
          entityId: id,
          metadata: { status: input.status },
        },
      });
      return { row, eventId };
    });

    if (result.eventId) await wakeNotificationWorker(result.eventId);
    if (newlyPublished) {
      await scheduleHomeworkReminder({
        organizationId: user.organizationId,
        homeworkId: id,
        dueDate: result.row.dueDate.toISOString(),
      });
    }
    return NextResponse.json(result.row);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("homework.update");
    const { id } = await params;
    await assertHomeworkAccess(user, id);
    await prisma.homework.update({
      where: { id },
      data: { active: false, status: "DRAFT" },
    });
    await audit(user, "ARCHIVE", "Homework", id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
