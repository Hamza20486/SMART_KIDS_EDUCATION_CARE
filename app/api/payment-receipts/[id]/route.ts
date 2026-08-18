import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { hasPermission, requirePermission } from "@/lib/permissions";
import { ForbiddenError } from "@/lib/auth";
import {
  getPrivateObject,
  privateDownloadUrl,
  putPrivateObject,
} from "@/lib/storage";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { receiptNumber, receiptPdf } from "@/lib/payments";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await getAuthContext();
    const { id } = await params;
    const row = await prisma.paymentReceipt.findFirst({
      where: { id, organizationId: context.organizationId },
      include: { payment: true },
    });
    if (!row?.storageKey || row.status !== "ISSUED") {
      return NextResponse.json({ error: "Receipt unavailable" }, { status: 404 });
    }
    if (context.role === "PARENT") {
      if (row.payment.parentId !== context.parentId) {
        throw new ForbiddenError("Forbidden");
      }
    } else if (!hasPermission(context.role, "payments.read")) {
      throw new ForbiddenError("Forbidden");
    }
    const signed = await privateDownloadUrl(row.storageKey, 60);
    if (signed) return NextResponse.redirect(signed);
    const data = await getPrivateObject(row.storageKey);
    return new NextResponse(data, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${row.receiptNumber}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("payments.issue_receipt");
    const { id } = await params;
    const old = await prisma.paymentReceipt.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        transaction: true,
        payment: { include: { organization: true, parent: true, child: true } },
      },
    });
    if (!old?.transaction) throw new Error("Not found");
    const year = new Date().getUTCFullYear();
    const created = await prisma.$transaction(
      async (tx) => {
        const sequence = await tx.receiptSequence.findUnique({
          where: {
            organizationId_year: { organizationId: user.organizationId, year },
          },
        });
        const number = sequence?.nextNumber ?? 1;
        if (sequence) {
          await tx.receiptSequence.update({
            where: {
              organizationId_year: { organizationId: user.organizationId, year },
            },
            data: { nextNumber: { increment: 1 } },
          });
        } else {
          await tx.receiptSequence.create({
            data: { organizationId: user.organizationId, year, nextNumber: 2 },
          });
        }
        const receiptNo = receiptNumber(year, number);
        const storageKey = `${user.organizationId}/receipts/${year}/${receiptNo}.pdf`;
        const receipt = await tx.paymentReceipt.create({
          data: {
            organizationId: user.organizationId,
            paymentId: old.paymentId,
            transactionId: old.transactionId,
            receiptNumber: receiptNo,
            storageKey,
            status: "PENDING",
            reissuedFromId: old.id,
            issuedById: user.id,
          },
        });
        return { receipt, storageKey };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      const pdf = await receiptPdf({
        receiptNumber: created.receipt.receiptNumber,
        organization: old.payment.organization.name,
        address: old.payment.organization.address,
        child: `${old.payment.child.firstName} ${old.payment.child.lastName}`,
        parent: `${old.payment.parent.firstName} ${old.payment.parent.lastName}`,
        amountCentimes: old.transaction.amountCentimes,
        method: old.transaction.method,
        reference: old.transaction.reference,
        paidAt: old.transaction.paidAt,
      });
      await putPrivateObject(created.storageKey, pdf, "application/pdf");
    } catch (error) {
      await prisma.paymentReceipt.update({
        where: { id: created.receipt.id },
        data: { status: "FAILED" },
      });
      throw error;
    }

    const eventId = await prisma.$transaction(async (tx) => {
      await tx.paymentReceipt.update({
        where: { id: created.receipt.id },
        data: { status: "ISSUED" },
      });
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "REISSUE",
          entity: "PaymentReceipt",
          entityId: created.receipt.id,
          metadata: { reissuedFromId: old.id },
        },
      });
      if (!old.payment.parent.userId) return null;
      const event = await enqueueNotificationEvent(tx, {
        organizationId: user.organizationId,
        eventKey: `receipt-issued:${created.receipt.id}`,
        eventType: "receipt.reissued",
        aggregateType: "PaymentReceipt",
        aggregateId: created.receipt.id,
        payload: {
          recipients: [old.payment.parent.userId],
          notificationType: "RECEIPT_ISSUED",
          title: "Nouveau reçu disponible",
          message: `Le reçu ${created.receipt.receiptNumber} remplace le reçu précédent.`,
          entityType: "PaymentReceipt",
          entityId: created.receipt.id,
        },
      });
      return event.id;
    });
    if (eventId) await wakeNotificationWorker(eventId);
    return NextResponse.json(
      { id: created.receipt.id, receiptNumber: created.receipt.receiptNumber },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requirePermission("payments.issue_receipt");
    const { id } = await params;
    const { reason } = z
      .object({ reason: z.string().min(5).max(500) })
      .parse(await request.json());
    const row = await prisma.paymentReceipt.findFirst({
      where: { id, organizationId: user.organizationId, status: "ISSUED" },
    });
    if (!row) throw new Error("Not found");
    await prisma.paymentReceipt.update({
      where: { id },
      data: { status: "VOID", voidedAt: new Date(), voidReason: reason },
    });
    await audit(user, "VOID", "PaymentReceipt", id, { reason });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
