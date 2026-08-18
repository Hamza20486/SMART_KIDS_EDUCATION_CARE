import { prisma } from "../prisma";
import { BadRequestError } from "../errors";
import { percentage, type ReportFilters } from "./types";

function add(record: Record<string, number>, key: string, value: number) {
  record[key] = (record[key] ?? 0) + value;
}

export async function financialReport(filters: Omit<ReportFilters, "authorizedClassIds">) {
  const payments = await prisma.payment.findMany({
    where: {
      organizationId: filters.organizationId,
      ...(filters.classId ? { child: { classId: filters.classId } } : {}),
    },
    include: {
      child: { include: { class: true } },
      parent: true,
      category: true,
      transactions: { orderBy: { paidAt: "asc" } },
      receipts: {
        where: {
          OR: [
            { issuedAt: { gte: filters.from, lte: filters.to } },
            { voidedAt: { gte: filters.from, lte: filters.to } },
          ],
        },
      },
    },
    orderBy: { dueDate: "asc" },
    take: 20_001,
  });
  if (payments.length > 20_000) {
    throw new BadRequestError("Report is too large; select a class");
  }

  const obligationsInPeriod = payments.filter(
    (payment) => payment.dueDate >= filters.from && payment.dueDate <= filters.to,
  );
  const transactionsInPeriod = payments.flatMap((payment) =>
    payment.transactions
      .filter(
        (transaction) =>
          transaction.paidAt >= filters.from && transaction.paidAt <= filters.to,
      )
      .map((transaction) => ({ transaction, payment })),
  );

  const statusCounts: Record<string, number> = {
    PENDING: 0,
    PARTIAL: 0,
    PAID: 0,
    OVERDUE: 0,
    CANCELLED: 0,
  };
  const revenueByMonth: Record<string, number> = {};
  const revenueByMethod: Record<string, number> = {};
  const outstandingByChild = new Map<
    string,
    { childId: string; childName: string; className: string; amountCentimes: number }
  >();
  const outstandingByClass: Record<string, number> = {};

  let billedGross = 0;
  let billedNet = 0;
  let discounts = 0;
  for (const payment of obligationsInPeriod) {
    if (payment.status !== "CANCELLED") {
      billedGross += payment.grossAmountCentimes;
      billedNet += payment.amountCentimes;
      discounts += payment.discountCentimes;
    }
    add(statusCounts, payment.status, 1);
  }

  let currentOutstanding = 0;
  for (const payment of payments) {
    if (payment.status === "CANCELLED") continue;
    const paid = payment.transactions.reduce(
      (total, transaction) => total + transaction.amountCentimes,
      0,
    );
    const outstanding = Math.max(0, payment.amountCentimes - paid);
    currentOutstanding += outstanding;
    if (!outstanding) continue;
    const existing = outstandingByChild.get(payment.childId) ?? {
      childId: payment.childId,
      childName: `${payment.child.firstName} ${payment.child.lastName}`,
      className: payment.child.class?.name ?? "—",
      amountCentimes: 0,
    };
    existing.amountCentimes += outstanding;
    outstandingByChild.set(payment.childId, existing);
    add(outstandingByClass, payment.child.class?.name ?? "—", outstanding);
  }

  let collected = 0;
  for (const { transaction } of transactionsInPeriod) {
    collected += transaction.amountCentimes;
    const month = transaction.paidAt.toISOString().slice(0, 7);
    add(revenueByMonth, month, transaction.amountCentimes);
    add(revenueByMethod, transaction.method, transaction.amountCentimes);
  }

  const receiptRows = payments.flatMap((payment) => payment.receipts);
  const voidedReceipts = receiptRows.filter((receipt) => receipt.status === "VOID").length;
  const reissuedReceipts = receiptRows.filter((receipt) => receipt.reissuedFromId).length;
  const partialPayments = payments.filter((payment) => payment.status === "PARTIAL").length;
  const receiptActivity = payments
    .flatMap((payment) =>
      payment.receipts.map((receipt) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        childName: `${payment.child.firstName} ${payment.child.lastName}`,
        status: receipt.status,
        issuedAt: receipt.issuedAt,
        voidedAt: receipt.voidedAt,
        reissued: Boolean(receipt.reissuedFromId),
      })),
    )
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());

  return {
    summary: {
      billedGrossCentimes: billedGross,
      discountsCentimes: discounts,
      billedNetCentimes: billedNet,
      collectedCentimes: collected,
      currentOutstandingCentimes: currentOutstanding,
      collectionRate: percentage(collected, billedNet),
      obligations: obligationsInPeriod.length,
      transactions: transactionsInPeriod.length,
      partialPayments,
      voidedReceipts,
      reissuedReceipts,
    },
    statusCounts,
    revenueByMonth: Object.entries(revenueByMonth)
      .map(([month, amountCentimes]) => ({ month, amountCentimes }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    revenueByMethod: Object.entries(revenueByMethod)
      .map(([method, amountCentimes]) => ({ method, amountCentimes }))
      .sort((a, b) => b.amountCentimes - a.amountCentimes),
    outstandingByChild: [...outstandingByChild.values()].sort(
      (a, b) => b.amountCentimes - a.amountCentimes,
    ),
    outstandingByClass: Object.entries(outstandingByClass)
      .map(([className, amountCentimes]) => ({ className, amountCentimes }))
      .sort((a, b) => b.amountCentimes - a.amountCentimes),
    receiptActivity,
    exportRows: obligationsInPeriod.map((payment) => {
      const paid = payment.transactions.reduce(
        (total, transaction) => total + transaction.amountCentimes,
        0,
      );
      return {
        child: `${payment.child.firstName} ${payment.child.lastName}`,
        parent: `${payment.parent.firstName} ${payment.parent.lastName}`,
        className: payment.child.class?.name ?? "—",
        category: payment.category?.name ?? "",
        academicPeriod: payment.academicPeriod ?? "",
        grossCentimes: payment.grossAmountCentimes,
        discountCentimes: payment.discountCentimes,
        netCentimes: payment.amountCentimes,
        paidCentimes: paid,
        outstandingCentimes: Math.max(0, payment.amountCentimes - paid),
        dueDate: payment.dueDate,
        status: payment.status,
        reference: payment.reference ?? "",
      };
    }),
  };
}
