import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/policies";
import { parseDateKey } from "@/lib/date";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsByChild } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const bulkSchema = z.object({
  classId: z.string(),
  date: z.string(),
  entries: z
    .array(
      z.object({
        childId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
        note: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function GET(request: Request) {
  try {
    const user = await requirePermission("attendance.read");
    const url = new URL(request.url);
    const classId = url.searchParams.get("classId") || "";
    const date = parseDateKey(url.searchParams.get("date") || "");
    await assertClassAccess(user, classId);
    const children = await prisma.child.findMany({
      where: {
        organizationId: user.organizationId,
        classId,
        active: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        attendances: { where: { date }, take: 1 },
        pickupAuthorizations: {
          where: { active: true },
          select: { id: true, name: true, relationship: true },
        },
      },
      orderBy: { lastName: "asc" },
    });
    return NextResponse.json({
      date: date.toISOString().slice(0, 10),
      classId,
      children: children.map((child) => ({
        ...child,
        attendance: child.attendances[0] || null,
        attendances: undefined,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("attendance.record");
    const input = bulkSchema.parse(await request.json());
    const date = parseDateKey(input.date);
    await assertClassAccess(user, input.classId);
    const children = await prisma.child.findMany({
      where: {
        organizationId: user.organizationId,
        classId: input.classId,
        active: true,
        id: { in: input.entries.map((entry) => entry.childId) },
      },
      select: { id: true, firstName: true },
    });
    const uniqueChildIds = [...new Set(input.entries.map((entry) => entry.childId))];
    if (children.length !== uniqueChildIds.length) throw new Error("Not found");
    const childName = new Map(children.map((child) => [child.id, child.firstName]));

    const result = await prisma.$transaction(async (tx) => {
      const recipients = await parentUserIdsByChild(
        tx,
        user.organizationId,
        uniqueChildIds,
      );
      const rows = [];
      const eventIds: string[] = [];
      for (const entry of input.entries) {
        const previous = await tx.attendance.findUnique({
          where: {
            organizationId_childId_date: {
              organizationId: user.organizationId,
              childId: entry.childId,
              date,
            },
          },
          select: { status: true },
        });
        const row = await tx.attendance.upsert({
          where: {
            organizationId_childId_date: {
              organizationId: user.organizationId,
              childId: entry.childId,
              date,
            },
          },
          update: {
            status: entry.status,
            note: entry.note,
            recordedById: user.id,
          },
          create: {
            organizationId: user.organizationId,
            childId: entry.childId,
            date,
            status: entry.status,
            note: entry.note,
            recordedById: user.id,
          },
        });
        rows.push(row);
        const childRecipients = recipients.get(entry.childId) ?? [];
        if (childRecipients.length && previous?.status !== entry.status) {
          const event = await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `attendance-status:${row.id}:${row.updatedAt.toISOString()}`,
            eventType: "attendance.status_changed",
            aggregateType: "Attendance",
            aggregateId: row.id,
            payload: {
              recipients: childRecipients,
              notificationType: "ATTENDANCE_CHANGED",
              title: `Présence de ${childName.get(entry.childId) ?? "votre enfant"}`,
              message: `Statut du ${input.date} : ${entry.status}.`,
              entityType: "Attendance",
              entityId: row.id,
            },
          });
          eventIds.push(event.id);
        }
      }
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "ATTENDANCE_BULK_UPSERT",
          entity: "Attendance",
          metadata: {
            classId: input.classId,
            date: input.date,
            count: rows.length,
          },
        },
      });
      return { count: rows.length, eventIds };
    });
    await Promise.all(result.eventIds.map((id) => wakeNotificationWorker(id)));
    return NextResponse.json({ ok: true, count: result.count });
  } catch (error) {
    return apiError(error);
  }
}
