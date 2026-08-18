import { prisma } from "./prisma";
import { enqueueNotificationEvent } from "./notifications/outbox";
import { parentUserIdsForChildren } from "./notifications/recipients";
import { wakeNotificationWorker } from "./inngest/client";

/**
 * Backward-compatible helper retained for existing callers. New workflows
 * should enqueue their notification event inside the business transaction.
 */
export async function notifyHomeworkPublished(
  homeworkId: string,
  organizationId: string,
) {
  const homework = await prisma.homework.findFirst({
    where: { id: homeworkId, organizationId },
    include: { assignments: true },
  });
  if (!homework) return 0;
  const childIds = homework.assignments.length
    ? homework.assignments.filter((item) => item.required).map((item) => item.childId)
    : (
        await prisma.child.findMany({
          where: { organizationId, classId: homework.classId, active: true },
          select: { id: true },
        })
      ).map((child) => child.id);
  const result = await prisma.$transaction(async (tx) => {
    const recipients = await parentUserIdsForChildren(tx, organizationId, childIds);
    if (!recipients.length) return { count: 0, eventId: null as string | null };
    const event = await enqueueNotificationEvent(tx, {
      organizationId,
      eventKey: `homework-published:${homework.id}:${homework.publishedAt?.toISOString() ?? homework.updatedAt.toISOString()}`,
      eventType: "homework.published",
      aggregateType: "Homework",
      aggregateId: homework.id,
      payload: {
        recipients,
        notificationType: "HOMEWORK_PUBLISHED",
        title: `Nouveau devoir : ${homework.title}`,
        message: `Échéance : ${homework.dueDate.toLocaleDateString("fr-MA")}`,
        entityType: "Homework",
        entityId: homework.id,
      },
    });
    return { count: recipients.length, eventId: event.id };
  });
  if (result.eventId) await wakeNotificationWorker(result.eventId);
  return result.count;
}
