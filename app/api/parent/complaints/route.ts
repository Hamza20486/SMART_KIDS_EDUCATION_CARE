import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { ForbiddenError } from "@/lib/auth";
import { complaintSchema } from "@/lib/validation";
import { complaintsRepository } from "@/lib/repositories/complaints";
import { apiError } from "@/lib/api";
import { complaintReference, complaintSla } from "@/lib/complaints";
import {
  scheduleComplaintEscalation,
  wakeNotificationWorker,
} from "@/lib/inngest/client";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { operationalStaffUserIds } from "@/lib/notifications/recipients";
import { requireFeature } from "@/lib/subscriptions/service";

export async function GET() {
  try {
    const context = await getAuthContext();
    await requireFeature(context, "advancedCommunication");
    if (context.role !== "PARENT") {
      throw new ForbiddenError("Insufficient permission");
    }
    return NextResponse.json(await complaintsRepository.list(context));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();
    await requireFeature(context, "advancedCommunication");
    if (context.role !== "PARENT" || !context.parentId) {
      throw new ForbiddenError("Parent profile missing");
    }
    const input = complaintSchema.parse(await request.json());
    if (
      input.childId &&
      !(await prisma.parentChild.findFirst({
        where: {
          organizationId: context.organizationId,
          parentId: context.parentId,
          childId: input.childId,
        },
      }))
    ) {
      throw new Error("Not found");
    }
    const reference = complaintReference();
    const slaDueAt = complaintSla("NORMAL");
    const result = await prisma.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          organizationId: context.organizationId,
          reference,
          parentId: context.parentId!,
          childId: input.childId || null,
          category: input.category,
          subject: input.subject,
          slaDueAt,
        },
      });
      await tx.complaintMessage.create({
        data: {
          organizationId: context.organizationId,
          complaintId: complaint.id,
          senderId: context.id,
          message: input.message,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          userId: context.id,
          action: "CREATE",
          entity: "Complaint",
          entityId: complaint.id,
        },
      });
      const recipients = await operationalStaffUserIds(tx, context.organizationId);
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: context.organizationId,
            eventKey: `complaint-created:${complaint.id}`,
            eventType: "complaint.created",
            aggregateType: "Complaint",
            aggregateId: complaint.id,
            payload: {
              recipients,
              notificationType: "COMPLAINT_CREATED",
              title: `Nouvelle réclamation ${reference}`,
              message: input.subject,
              entityType: "Complaint",
              entityId: complaint.id,
            },
          })
        : null;
      return { complaint, eventId: event?.id ?? null };
    });
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    await scheduleComplaintEscalation({
      organizationId: context.organizationId,
      complaintId: result.complaint.id,
      slaDueAt,
    });
    return NextResponse.json(result.complaint, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
