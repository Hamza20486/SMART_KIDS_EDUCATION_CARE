import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { announcementSchema } from "@/lib/validation";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

export async function GET() {
  try {
    const user = await requirePermission("announcements.read");
    return NextResponse.json(
      await prisma.announcement.findMany({
        where: { organizationId: user.organizationId },
        include: { class: true },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("announcements.publish");
    const input = announcementSchema.parse(await request.json());
    if (
      input.classId &&
      !(await prisma.classRoom.findFirst({
        where: { id: input.classId, organizationId: user.organizationId },
      }))
    ) {
      throw new Error("Not found");
    }

    const result = await prisma.$transaction(async (tx) => {
      const announcement = await tx.announcement.create({
        data: {
          ...input,
          organizationId: user.organizationId,
          createdById: user.id,
          publishedAt: input.publishedAt ?? new Date(),
        },
      });
      let recipients: string[] = [];
      if (input.audience === "CLASS" && input.classId) {
        const childIds = (
          await tx.child.findMany({
            where: {
              organizationId: user.organizationId,
              classId: input.classId,
              active: true,
            },
            select: { id: true },
          })
        ).map((child) => child.id);
        const parentIds = await parentUserIdsForChildren(tx, user.organizationId, childIds);
        const teacherIds = (
          await tx.classTeacher.findMany({
            where: { organizationId: user.organizationId, classId: input.classId },
            select: { teacherId: true },
          })
        ).map((assignment) => assignment.teacherId);
        recipients = [...new Set([...parentIds, ...teacherIds])];
      } else {
        recipients = (
          await tx.user.findMany({
            where: {
              organizationId: user.organizationId,
              active: true,
              ...(input.audience === "PARENTS"
                ? { role: "PARENT" }
                : input.audience === "STAFF"
                  ? { role: { in: ["ADMIN", "MANAGER", "TEACHER", "ACCOUNTANT"] } }
                  : { role: { not: "SUPER_ADMIN" } }),
            },
            select: { id: true },
          })
        ).map((recipient) => recipient.id);
      }
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `announcement:${announcement.id}`,
            eventType: "announcement.published",
            aggregateType: "Announcement",
            aggregateId: announcement.id,
            payload: {
              recipients,
              notificationType: "ANNOUNCEMENT",
              title: input.title,
              message: input.content,
              entityType: "Announcement",
              entityId: announcement.id,
            },
          })
        : null;
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "CREATE",
          entity: "Announcement",
          entityId: announcement.id,
        },
      });
      return { announcement, eventId: event?.id ?? null };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json(result.announcement, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
