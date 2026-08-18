import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { ForbiddenError } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { assertComplaintAccess } from "@/lib/policies";
import { sanitizeAttachment } from "@/lib/attachment-security";
import { storageQuota } from "@/lib/media-security";
import { deletePrivateObject, putPrivateObject } from "@/lib/storage";
import { checkRateLimit, requestIdentifier } from "@/lib/rate-limit";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let storageKey = "";
  try {
    const context = await getAuthContext();
    const { id } = await params;
    const complaint = await assertComplaintAccess(context, id);
    if (complaint.status === "CLOSED") {
      return NextResponse.json(
        { error: "Closed complaints cannot receive messages" },
        { status: 409 },
      );
    }
    const isParent = context.role === "PARENT";
    if (!isParent && !hasPermission(context.role, "complaints.respond")) {
      throw new ForbiddenError("Forbidden");
    }
    const limit = await checkRateLimit("upload", requestIdentifier(request));
    if (!limit.success) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
    const form = await request.formData();
    const messageText = String(form.get("message") || "").trim().slice(0, 3_000);
    const internal = !isParent && String(form.get("internal")) === "true";
    const file = form.get("file");
    if (!messageText) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (internal && !hasPermission(context.role, "complaints.internal_note")) {
      throw new ForbiddenError("Forbidden");
    }

    const messageId = randomUUID();
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
      storageKey = `${context.organizationId}/complaints/${id}/${messageId}/${randomUUID()}`;
      await putPrivateObject(storageKey, attachment.data, attachment.mimeType);
    }

    const parentRecord = await prisma.parent.findUnique({
      where: { id: complaint.parentId },
      select: { userId: true },
    });
    const result = await prisma.$transaction(async (tx) => {
      await tx.complaintMessage.create({
        data: {
          id: messageId,
          organizationId: context.organizationId,
          complaintId: id,
          senderId: context.id,
          message: messageText,
          internal,
        },
      });
      if (attachment) {
        await tx.complaintAttachment.create({
          data: {
            organizationId: context.organizationId,
            complaintId: id,
            messageId,
            storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.data.length,
            checksumSha256: attachment.checksum,
            uploadedById: context.id,
          },
        });
      }
      if (isParent && complaint.status === "RESOLVED") {
        await tx.complaint.update({
          where: { id },
          data: { status: "IN_PROGRESS", resolvedAt: null },
        });
      }

      let recipients: string[] = [];
      if (!internal) {
        recipients = isParent
          ? complaint.assignedToId
            ? [complaint.assignedToId]
            : (
                await tx.user.findMany({
                  where: {
                    organizationId: context.organizationId,
                    active: true,
                    role: { in: ["ADMIN", "MANAGER"] },
                  },
                  select: { id: true },
                })
              ).map((user) => user.id)
          : parentRecord?.userId
            ? [parentRecord.userId]
            : [];
      }
      const event = recipients.length
        ? await enqueueNotificationEvent(tx, {
            organizationId: context.organizationId,
            eventKey: `complaint-message:${messageId}`,
            eventType: "complaint.message_created",
            aggregateType: "Complaint",
            aggregateId: id,
            payload: {
              recipients,
              notificationType: "COMPLAINT_MESSAGE",
              title: `Nouveau message ${complaint.reference}`,
              message: messageText.slice(0, 300),
              entityType: "Complaint",
              entityId: id,
            },
          })
        : null;
      await tx.auditLog.create({
        data: {
          organizationId: context.organizationId,
          userId: context.id,
          action: internal ? "INTERNAL_NOTE" : "MESSAGE",
          entity: "Complaint",
          entityId: id,
        },
      });
      return { eventId: event?.id ?? null };
    });
    storageKey = "";
    if (result.eventId) await wakeNotificationWorker(result.eventId);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (storageKey) await deletePrivateObject(storageKey);
    return apiError(error);
  }
}
