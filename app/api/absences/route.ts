import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authorizedClassIds, requirePermission } from "@/lib/permissions";
import { apiError } from "@/lib/api";
import { datesInclusive } from "@/lib/absence";
import {
  scheduleAbsenceFollowup,
  wakeNotificationWorker,
} from "@/lib/inngest/client";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";

export async function GET() {
  try {
    const user = await requirePermission("absences.read");
    const classIds = await authorizedClassIds(user);
    return NextResponse.json(
      await prisma.absenceRequest.findMany({
        where: {
          organizationId: user.organizationId,
          ...(classIds ? { child: { classId: { in: classIds } } } : {}),
        },
        include: {
          child: true,
          parent: true,
          attachments: {
            where: { deletedAt: null },
            select: { id: true, originalName: true, sizeBytes: true },
          },
          reviewedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

const decisionSchema = z.object({
  id: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(1_000).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requirePermission("absences.review");
    const input = decisionSchema.parse(await request.json());
    const absence = await prisma.absenceRequest.findFirst({
      where: {
        id: input.id,
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: { parent: true, child: true },
    });
    if (!absence) throw new Error("Not found");

    const result = await prisma.$transaction(async (tx) => {
      await tx.absenceRequest.update({
        where: { id: absence.id },
        data: {
          status: input.status,
          reviewNote: input.reviewNote,
          reviewedById: user.id,
          reviewedAt: new Date(),
          attendanceSyncedAt: input.status === "APPROVED" ? new Date() : null,
        },
      });
      if (input.status === "APPROVED") {
        for (const date of datesInclusive(absence.startDate, absence.endDate)) {
          await tx.attendance.upsert({
            where: {
              organizationId_childId_date: {
                organizationId: user.organizationId,
                childId: absence.childId,
                date,
              },
            },
            update: {
              status: "EXCUSED",
              note: `Absence approuvée: ${absence.reason}`,
              recordedById: user.id,
            },
            create: {
              organizationId: user.organizationId,
              childId: absence.childId,
              date,
              status: "EXCUSED",
              note: `Absence approuvée: ${absence.reason}`,
              recordedById: user.id,
            },
          });
        }
      }
      const event = absence.parent.userId
        ? await enqueueNotificationEvent(tx, {
            organizationId: user.organizationId,
            eventKey: `absence-decision:${absence.id}:${input.status}`,
            eventType: "absence.decided",
            aggregateType: "AbsenceRequest",
            aggregateId: absence.id,
            payload: {
              recipients: [absence.parent.userId],
              notificationType: "ABSENCE_DECISION",
              title: `Demande d'absence ${input.status === "APPROVED" ? "approuvée" : "refusée"}`,
              message:
                input.reviewNote ||
                `${absence.child.firstName} — ${absence.startDate.toLocaleDateString("fr-MA")} au ${absence.endDate.toLocaleDateString("fr-MA")}`,
              entityType: "AbsenceRequest",
              entityId: absence.id,
            },
          })
        : null;
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: `ABSENCE_${input.status}`,
          entity: "AbsenceRequest",
          entityId: absence.id,
        },
      });
      return { eventId: event?.id ?? null };
    });

    if (result.eventId) await wakeNotificationWorker(result.eventId);
    if (input.status === "APPROVED") {
      await scheduleAbsenceFollowup({
        organizationId: user.organizationId,
        absenceRequestId: absence.id,
        startDate: absence.startDate.toISOString(),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
