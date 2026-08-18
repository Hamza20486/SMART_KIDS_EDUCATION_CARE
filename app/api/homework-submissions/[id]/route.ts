import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizedClassIds, requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const reviewSchema = z.object({
  status: z.enum(["REVIEWED", "RETURNED"]),
  teacherFeedback: z.string().min(2).max(2_000),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("homework.review_submission");
    const { id } = await params;
    const input = reviewSchema.parse(await request.json());
    const classIds = await authorizedClassIds(user);
    const submission = await prisma.homeworkSubmission.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
        ...(classIds ? { homework: { classId: { in: classIds } } } : {}),
      },
      include: { homework: true, child: true },
    });
    if (!submission) throw new Error("Not found");

    const result = await prisma.$transaction(async (tx) => {
      const reviewed = await tx.homeworkSubmission.update({
        where: { id },
        data: {
          status: input.status,
          teacherFeedback: input.teacherFeedback,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });
      const recipients = await parentUserIdsForChildren(
        tx,
        user.organizationId,
        [submission.childId],
      );
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `homework-review:${id}:${reviewed.updatedAt.toISOString()}`,
            eventType: "homework.submission_reviewed",
            aggregateType: "HomeworkSubmission",
            aggregateId: id,
            payload: {
              recipients,
              notificationType: "HOMEWORK_REVIEW",
              title: `Devoir révisé : ${submission.homework.title}`,
              message: input.teacherFeedback,
              entityType: "HomeworkSubmission",
              entityId: id,
            },
          })
        : null;
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: input.status,
          entity: "HomeworkSubmission",
          entityId: id,
        },
      });
      return { eventId: event?.id ?? null };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
