import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hasPermission,
  requireAnyPermission,
  requirePermission,
} from "@/lib/permissions";
import { ForbiddenError } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { assertComplaintAccess } from "@/lib/policies";
import { canTransitionComplaint, complaintSla } from "@/lib/complaints";
import {
  scheduleComplaintEscalation,
  wakeNotificationWorker,
} from "@/lib/inngest/client";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("complaints.read");
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const query = url.searchParams.get("q")?.trim();
    return NextResponse.json(
      await prisma.complaint.findMany({
        where: {
          organizationId: user.organizationId,
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(query
            ? {
                OR: [
                  { reference: { contains: query, mode: "insensitive" } },
                  { subject: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          parent: true,
          child: true,
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { messages: true } },
        },
        orderBy: [{ slaDueAt: "asc" }, { updatedAt: "desc" }],
        take: 200,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  message: z.string().min(1).max(3_000).optional(),
  internal: z.boolean().optional(),
  assignedToId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireAnyPermission([
      "complaints.respond",
      "complaints.assign",
      "complaints.internal_note",
    ]);
    const input = updateSchema.parse(await request.json());
    const found = await assertComplaintAccess(user, input.id);
    if (input.status && !hasPermission(user.role, "complaints.respond")) {
      throw new ForbiddenError("Forbidden");
    }
    if (input.status && !canTransitionComplaint(found.status, input.status)) {
      return NextResponse.json({ error: "Invalid status transition" }, { status: 409 });
    }
    if (input.message && !hasPermission(user.role, "complaints.respond")) {
      throw new ForbiddenError("Forbidden");
    }
    if (input.internal && !hasPermission(user.role, "complaints.internal_note")) {
      throw new ForbiddenError("Forbidden");
    }
    if (
      (input.assignedToId !== undefined || input.priority) &&
      !hasPermission(user.role, "complaints.assign")
    ) {
      throw new ForbiddenError("Forbidden");
    }
    if (
      input.assignedToId &&
      !(await prisma.user.findFirst({
        where: {
          id: input.assignedToId,
          organizationId: user.organizationId,
          active: true,
          role: { in: ["ADMIN", "MANAGER"] },
        },
      }))
    ) {
      throw new ForbiddenError("Resource unavailable");
    }

    const nextSla = input.priority ? complaintSla(input.priority, found.createdAt) : null;
    const parent = await prisma.parent.findUnique({
      where: { id: found.parentId },
      select: { userId: true },
    });
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.complaint.update({
        where: { id: input.id },
        data: {
          status: input.status,
          assignedToId: input.assignedToId,
          priority: input.priority,
          slaDueAt: nextSla ?? undefined,
          resolvedAt:
            input.status === "RESOLVED"
              ? new Date()
              : input.status === "IN_PROGRESS"
                ? null
                : undefined,
          closedAt: input.status === "CLOSED" ? new Date() : undefined,
        },
      });
      const message = input.message
        ? await tx.complaintMessage.create({
            data: {
              organizationId: user.organizationId,
              complaintId: input.id,
              senderId: user.id,
              message: input.message,
              internal: input.internal ?? false,
            },
          })
        : null;
      let eventId: string | null = null;
      const parentVisibleUpdate = Boolean(input.status || (input.message && !input.internal));
      if (parent?.userId && parentVisibleUpdate) {
        const event = await enqueueNotificationEvent(tx, {
          organizationId: user.organizationId,
          eventKey: `complaint-update:${input.id}:${message?.id ?? updated.updatedAt.toISOString()}`,
          eventType: "complaint.updated",
          aggregateType: "Complaint",
          aggregateId: input.id,
          payload: {
            recipients: [parent.userId],
            notificationType: "COMPLAINT_UPDATE",
            title: `Mise à jour ${found.reference}`,
            message: input.message || `Statut : ${input.status}`,
            entityType: "Complaint",
            entityId: input.id,
          },
        });
        eventId = event.id;
      }
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "UPDATE",
          entity: "Complaint",
          entityId: input.id,
          metadata: {
            status: input.status,
            internal: input.internal,
            assignedToId: input.assignedToId,
            priority: input.priority,
          },
        },
      });
      return { eventId };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    if (nextSla) {
      await scheduleComplaintEscalation({
        organizationId: user.organizationId,
        complaintId: input.id,
        slaDueAt: nextSla,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
