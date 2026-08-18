import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  authorizedClassIds,
  requirePermission,
  requireTeacherChildAccess,
} from "@/lib/permissions";
import { dateKey, parseDateKey } from "@/lib/date";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { parentUserIdsForChildren } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("attendance.read");
    const ids = await authorizedClassIds(user);
    const key = new URL(request.url).searchParams.get("date") || dateKey(new Date());
    const date = parseDateKey(key);
    return NextResponse.json(
      await prisma.attendance.findMany({
        where: {
          organizationId: user.organizationId,
          date,
          ...(ids ? { child: { classId: { in: ids } } } : {}),
        },
        include: { child: true, pickupAuthorization: true },
        orderBy: { arrivalAt: "asc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

const timeSchema = z.object({
  childId: z.string(),
  date: z.string(),
  action: z.enum(["ARRIVAL", "DEPARTURE"]),
  pickupAuthorizationId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("attendance.record");
    const input = timeSchema.parse(await request.json());
    await requireTeacherChildAccess(user, input.childId);
    const date = parseDateKey(input.date);
    const now = new Date();
    let pickup: null | { id: string; name: string } = null;
    if (input.action === "DEPARTURE") {
      if (!input.pickupAuthorizationId) {
        return NextResponse.json(
          { error: "Authorized pickup person required" },
          { status: 400 },
        );
      }
      pickup = await prisma.authorizedPickupPerson.findFirst({
        where: {
          id: input.pickupAuthorizationId,
          organizationId: user.organizationId,
          childId: input.childId,
          active: true,
        },
        select: { id: true, name: true },
      });
      if (!pickup) {
        return NextResponse.json(
          { error: "Pickup person is not authorized" },
          { status: 403 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const child = await tx.child.findFirstOrThrow({
        where: { id: input.childId, organizationId: user.organizationId },
        select: { firstName: true },
      });
      const changes =
        input.action === "ARRIVAL"
          ? { arrivalAt: now }
          : {
              departureAt: now,
              pickupPerson: pickup!.name,
              pickupAuthorizationId: pickup!.id,
            };
      const row = await tx.attendance.upsert({
        where: {
          organizationId_childId_date: {
            organizationId: user.organizationId,
            childId: input.childId,
            date,
          },
        },
        update: { ...changes, recordedById: user.id },
        create: {
          organizationId: user.organizationId,
          childId: input.childId,
          date,
          status: "PRESENT",
          recordedById: user.id,
          ...changes,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: input.action,
          entity: "Attendance",
          entityId: row.id,
          metadata: { pickupAuthorizationId: pickup?.id },
        },
      });
      const recipients = await parentUserIdsForChildren(
        tx,
        user.organizationId,
        [input.childId],
      );
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `attendance-time:${row.id}:${input.action}:${row.updatedAt.toISOString()}`,
            eventType:
              input.action === "ARRIVAL" ? "attendance.arrival" : "attendance.departure",
            aggregateType: "Attendance",
            aggregateId: row.id,
            payload: {
              recipients,
              notificationType:
                input.action === "ARRIVAL" ? "ARRIVAL_RECORDED" : "DEPARTURE_RECORDED",
              title:
                input.action === "ARRIVAL"
                  ? `Arrivée de ${child.firstName}`
                  : `Départ de ${child.firstName}`,
              message:
                input.action === "ARRIVAL"
                  ? `Arrivée enregistrée à ${now.toLocaleTimeString("fr-MA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Casablanca" })}.`
                  : `Départ enregistré avec ${pickup!.name}.`,
              entityType: "Attendance",
              entityId: row.id,
            },
          })
        : null;
      return { row, eventId: event?.id ?? null };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json(result.row);
  } catch (error) {
    return apiError(error);
  }
}
