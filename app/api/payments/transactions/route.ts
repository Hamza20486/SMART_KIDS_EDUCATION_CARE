import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { paymentStatus, receiptNumber, receiptPdf } from "@/lib/payments";
import { putPrivateObject } from "@/lib/storage";
import { apiError } from "@/lib/api";
import { enqueueNotificationEvent } from "@/lib/notifications/outbox";
import { wakeNotificationWorker } from "@/lib/inngest/client";

const paymentTransactionSchema = z.object({
  paymentId: z.string(),
  amountDh: z.coerce.number().positive(),
  method: z.enum(["CASH", "BANK_TRANSFER", "CHEQUE", "CARD_MANUAL", "OTHER"]),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requirePermission("payments.update");
    const input = paymentTransactionSchema.parse(await request.json());
    const amount = Math.round(input.amountDh * 100);
    const payment = await prisma.payment.findFirst({
      where: {
        id: input.paymentId,
        organizationId: user.organizationId,
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        parent: true,
        child: true,
        organization: true,
        transactions: true,
      },
    });
    if (!payment) throw new Error("Not found");
    const alreadyPaid = payment.transactions.reduce(
      (total, transaction) => total + transaction.amountCentimes,
      0,
    );
    if (amount > payment.amountCentimes - alreadyPaid) {
      return NextResponse.json(
        { error: "Amount exceeds outstanding balance" },
        { status: 409 },
      );
    }

    const year = new Date().getUTCFullYear();
    const result = await prisma.$transaction(
      async (tx) => {
        const sequence = await tx.receiptSequence.findUnique({
          where: {
            organizationId_year: { organizationId: user.organizationId, year },
          },
        });
        let number: number;
        if (!sequence) {
          number = 1;
          await tx.receiptSequence.create({
            data: { organizationId: user.organizationId, year, nextNumber: 2 },
          });
        } else {
          number = sequence.nextNumber;
          await tx.receiptSequence.update({
            where: {
              organizationId_year: { organizationId: user.organizationId, year },
            },
            data: { nextNumber: { increment: 1 } },
          });
        }
        const transaction = await tx.paymentTransaction.create({
          data: {
            organizationId: user.organizationId,
            paymentId: payment.id,
            amountCentimes: amount,
            method: input.method,
            reference: input.reference,
            notes: input.notes,
            recordedById: user.id,
          },
        });
        const paid = alreadyPaid + amount;
        const status = paymentStatus(
          payment.amountCentimes,
          paid,
          payment.dueDate,
        );
        const receiptNo = receiptNumber(year, number);
        const storageKey = `${user.organizationId}/receipts/${year}/${receiptNo}.pdf`;
        const receipt = await tx.paymentReceipt.create({
          data: {
            organizationId: user.organizationId,
            paymentId: payment.id,
            transactionId: transaction.id,
            receiptNumber: receiptNo,
            storageKey,
            status: "PENDING",
            issuedById: user.id,
          },
        });
        await tx.payment.update({
          where: { id: payment.id },
          data: { status, paidAt: status === "PAID" ? new Date() : null },
        });
        return { transaction, receipt, storageKey };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      const pdf = await receiptPdf({
        receiptNumber: result.receipt.receiptNumber,
        organization: payment.organization.name,
        address: payment.organization.address,
        child: `${payment.child.firstName} ${payment.child.lastName}`,
        parent: `${payment.parent.firstName} ${payment.parent.lastName}`,
        amountCentimes: amount,
        method: input.method,
        reference: input.reference,
        paidAt: result.transaction.paidAt,
      });
      await putPrivateObject(result.storageKey, pdf, "application/pdf");
    } catch (error) {
      await prisma.paymentReceipt.update({
        where: { id: result.receipt.id },
        data: { status: "FAILED" },
      });
      throw error;
    }

    const completion = await prisma.$transaction(async (tx) => {
      await tx.paymentReceipt.update({
        where: { id: result.receipt.id },
        data: { status: "ISSUED" },
      });
      const eventIds: string[] = [];
      if (payment.parent.userId) {
        const paymentEvent = await enqueueNotificationEvent(tx, {
          organizationId: user.organizationId,
          eventKey: `payment-recorded:${result.transaction.id}`,
          eventType: "payment.recorded",
          aggregateType: "PaymentTransaction",
          aggregateId: result.transaction.id,
          payload: {
            recipients: [payment.parent.userId],
            notificationType: "PAYMENT_RECORDED",
            title: "Paiement enregistré",
            message: `${(amount / 100).toFixed(2)} MAD enregistrés.`,
            entityType: "Payment",
            entityId: payment.id,
            channels: ["IN_APP"],
          },
        });
        const receiptEvent = await enqueueNotificationEvent(tx, {
          organizationId: user.organizationId,
          eventKey: `receipt-issued:${result.receipt.id}`,
          eventType: "receipt.issued",
          aggregateType: "PaymentReceipt",
          aggregateId: result.receipt.id,
          payload: {
            recipients: [payment.parent.userId],
            notificationType: "RECEIPT_ISSUED",
            title: "Reçu disponible",
            message: `Reçu ${result.receipt.receiptNumber} disponible dans votre espace.`,
            entityType: "PaymentReceipt",
            entityId: result.receipt.id,
          },
        });
        eventIds.push(paymentEvent.id, receiptEvent.id);
      }
      await tx.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: "RECORD",
          entity: "PaymentTransaction",
          entityId: result.transaction.id,
          metadata: {
            amountCentimes: amount,
            receiptNumber: result.receipt.receiptNumber,
          },
        },
      });
      return eventIds;
    });
    await Promise.all(completion.map((id) => wakeNotificationWorker(id)));

    return NextResponse.json(
      {
        transactionId: result.transaction.id,
        receiptId: result.receipt.id,
        receiptNumber: result.receipt.receiptNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
