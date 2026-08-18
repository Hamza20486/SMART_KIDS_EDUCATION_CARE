import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { ForbiddenError } from "@/lib/auth";
import { absenceSchema } from "@/lib/validation";
import { assertChildAccess } from "@/lib/policies";
import { sanitizeAttachment } from "@/lib/attachment-security";
import { storageQuota } from "@/lib/media-security";
import { deletePrivateObject, putPrivateObject } from "@/lib/storage";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { apiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { operationalStaffUserIds } from "@/lib/notifications/recipients";
import { wakeNotificationWorker } from "@/lib/inngest/client";

async function parentContext() {
  const context = await getAuthContext();
  if (context.role !== "PARENT" || !context.parentId) {
    throw new ForbiddenError("Parent profile missing");
  }
  return context;
}

export async function GET() {
  try {
    const context = await parentContext();
    return NextResponse.json(
      await prisma.absenceRequest.findMany({
        where: {
          organizationId: context.organizationId,
          parentId: context.parentId!,
        },
        include: {
          child: true,
          attachments: {
            where: { deletedAt: null },
            select: { id: true, originalName: true, sizeBytes: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  let storageKey = "";
  try {
    const context = await parentContext();
    if (!hasPermission(context.role, "absences.submit")) {
      throw new ForbiddenError("Forbidden");
    }
    const limit = await checkRateLimit("upload", requestIdentifier(request));
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const form = await request.formData();
    const input = absenceSchema.parse({
      childId: form.get("childId"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      reason: form.get("reason"),
    });
    await assertChildAccess(context, input.childId);
    if (input.endDate.getTime() - input.startDate.getTime() > 90 * 86_400_000) {
      return NextResponse.json(
        { error: "Maximum absence duration is 90 days" },
        { status: 400 },
      );
    }
    const overlap = await prisma.absenceRequest.findFirst({
      where: {
        organizationId: context.organizationId,
        childId: input.childId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: input.endDate },
        endDate: { gte: input.startDate },
      },
    });
    if (overlap) {
      return NextResponse.json(
        { error: "An overlapping request already exists" },
        { status: 409 },
      );
    }

    const id = randomUUID();
    const file = form.get("file");
    let attachment: Awaited<ReturnType<typeof sanitizeAttachment>> | null = null;
    if (file instanceof File && file.size > 0) {
      attachment = await sanitizeAttachment(file);
      const quota = await storageQuota(context.organizationId);
      if (!quota.enabled || quota.usedBytes + attachment.data.length > quota.limitBytes) {
        return NextResponse.json(
          { error: "Attachment unavailable for this plan or quota" },
          { status: 413 },
        );
      }
      storageKey = `${context.organizationId}/absence/${id}/${randomUUID()}`;
      await putPrivateObject(storageKey, attachment.data, attachment.mimeType);
    }

    const result = await prisma.$transaction(async (tx) => {
      const absence = await tx.absenceRequest.create({
        data: {
          id,
          ...input,
          organizationId: context.organizationId,
          parentId: context.parentId!,
        },
        include: { child: { select: { firstName: true, lastName: true } } },
      });
      if (attachment) {
        await tx.absenceAttachment.create({
          data: {
            organizationId: context.organizationId,
            absenceRequestId: id,
            storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.data.length,
            checksumSha256: attachment.checksum,
            uploadedById: context.id,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          userId: context.id,
          action: "CREATE",
          entity: "AbsenceRequest",
          entityId: absence.id,
        },
      });
      const recipients = await operationalStaffUserIds(tx, context.organizationId);
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: context.organizationId,
            eventKey: `absence-submitted:${absence.id}`,
            eventType: "absence.submitted",
            aggregateType: "AbsenceRequest",
            aggregateId: absence.id,
            payload: {
              recipients,
              notificationType: "ABSENCE_SUBMITTED",
              title: `Nouvelle demande d'absence — ${absence.child.firstName}`,
              message: `${absence.startDate.toLocaleDateString("fr-MA")} au ${absence.endDate.toLocaleDateString("fr-MA")}`,
              entityType: "AbsenceRequest",
              entityId: absence.id,
            },
          })
        : null;
      return { absence, eventId: event?.id ?? null };
    });
    storageKey = "";
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json(result.absence, { status: 201 });
  } catch (error) {
    if (storageKey) await deletePrivateObject(storageKey);
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await parentContext();
    const { id } = z.object({ id: z.string() }).parse(await request.json());
    const row = await prisma.absenceRequest.updateMany({
      where: {
        id,
        organizationId: context.organizationId,
        parentId: context.parentId!,
        status: "PENDING",
      },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (!row.count) {
      throw new ForbiddenError("Only pending requests can be cancelled");
    }
    await prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        userId: context.id,
        action: "CANCEL",
        entity: "AbsenceRequest",
        entityId: id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
