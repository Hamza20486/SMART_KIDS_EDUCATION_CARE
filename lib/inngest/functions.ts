import { inngest } from "./client";
import { prisma } from "../prisma";
import { enqueueNotificationEvent } from "../notifications/outbox";
import {
  processOutboxEvent,
  processPendingEmailDeliveries,
  processPendingOutboxEvents,
  recoverStaleNotificationWork,
} from "../notifications/processor";
import { parentUserIdsForChildren } from "../notifications/recipients";
import { getEntitlements } from "../subscriptions/service";

export const notificationOutboxDispatch = inngest.createFunction(
  {
    id: "notification-outbox-dispatch",
    retries: 5,
    triggers: { event: "notification/outbox.dispatch" },
  },
  async ({ event, step }) => {
    const eventId = String(event.data.outboxEventId || "");
    if (!eventId) return { skipped: true };
    const outbox = await step.run("materialize-notifications", () =>
      processOutboxEvent(eventId),
    );
    const deliveries = await step.run("deliver-email", () =>
      processPendingEmailDeliveries(50),
    );
    return { outbox, deliveries };
  },
);

export const notificationWorkerSweep = inngest.createFunction(
  {
    id: "notification-worker-sweep",
    retries: 2,
    triggers: { cron: "*/1 * * * *" },
  },
  async ({ step }) => {
    const recovered = await step.run("recover-stale-locks", () =>
      recoverStaleNotificationWork(),
    );
    const outbox = await step.run("process-outbox", () =>
      processPendingOutboxEvents(100),
    );
    const deliveries = await step.run("deliver-email", () =>
      processPendingEmailDeliveries(100),
    );
    return { recovered, outbox, deliveries };
  },
);

export const paymentDueSweep = inngest.createFunction(
  { id: "payment-due-sweep", retries: 3, triggers: { cron: "0 6 * * *" } },
  async ({ step }) =>
    step.run("queue-due-notifications", async () => {
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000);
      const rows = await prisma.payment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          dueDate: { gte: start, lt: end },
          organization: { active: true },
        },
        include: { parent: true, child: true },
      });
      const eventIds: string[] = [];
      for (const row of rows) {
        if (!row.parent.userId) continue;
        const event = await prisma.$transaction((tx) =>
          enqueueNotificationEvent(tx, {
            organizationId: row.organizationId,
            eventKey: `payment-due:${row.id}:${row.dueDate.toISOString()}`,
            eventType: "payment.due",
            aggregateType: "Payment",
            aggregateId: row.id,
            payload: {
              recipients: [row.parent.userId!],
              notificationType: "PAYMENT_DUE",
              title: `Paiement à échéance — ${row.child.firstName}`,
              message: `Montant dû : ${(row.amountCentimes / 100).toFixed(2)} MAD`,
              entityType: "Payment",
              entityId: row.id,
            },
          }),
        );
        eventIds.push(event.id);
      }
      for (const id of eventIds) await processOutboxEvent(id);
      await processPendingEmailDeliveries(100);
      return { queued: eventIds.length };
    }),
);

export const paymentOverdueSweep = inngest.createFunction(
  {
    id: "payment-overdue-sweep",
    retries: 3,
    triggers: { cron: "15 6 * * *" },
  },
  async ({ step }) =>
    step.run("mark-and-notify", async () => {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);
      const rows = await prisma.payment.findMany({
        where: {
          status: { in: ["PENDING", "PARTIAL"] },
          dueDate: { lt: startOfToday },
          organization: { active: true },
        },
        include: { parent: true, child: true },
      });
      const eventIds: string[] = [];
      let updated = 0;
      for (const row of rows) {
        const result = await prisma.$transaction(async (tx) => {
          const changed = await tx.payment.updateMany({
            where: { id: row.id, status: row.status },
            data: { status: "OVERDUE" },
          });
          if (!changed.count) return { changed: false, eventId: null as string | null };
          await tx.auditLog.create({
            data: {
              organizationId: row.organizationId,
              action: "PAYMENT_OVERDUE",
              entity: "Payment",
              entityId: row.id,
            },
          });
          if (!row.parent.userId) return { changed: true, eventId: null as string | null };
          const event = await enqueueNotificationEvent(tx, {
            organizationId: row.organizationId,
            eventKey: `payment-overdue:${row.id}`,
            eventType: "payment.overdue",
            aggregateType: "Payment",
            aggregateId: row.id,
            payload: {
              recipients: [row.parent.userId],
              notificationType: "PAYMENT_OVERDUE",
              title: `Paiement en retard — ${row.child.firstName}`,
              message: `Montant : ${(row.amountCentimes / 100).toFixed(2)} MAD`,
              entityType: "Payment",
              entityId: row.id,
            },
          });
          return { changed: true, eventId: event.id };
        });
        if (result.changed) updated += 1;
        if (result.eventId) eventIds.push(result.eventId);
      }
      for (const id of eventIds) await processOutboxEvent(id);
      await processPendingEmailDeliveries(100);
      return { updated, queued: eventIds.length };
    }),
);

export const complaintSlaEscalation = inngest.createFunction(
  {
    id: "complaint-sla-escalation",
    retries: 3,
    triggers: { event: "complaint/opened" },
  },
  async ({ event, step }) => {
    const slaDueAt = new Date(String(event.data.slaDueAt));
    await step.sleepUntil("wait-for-sla", slaDueAt);
    return step.run("escalate-if-open", async () => {
      const row = await prisma.complaint.findFirst({
        where: {
          id: String(event.data.complaintId),
          organizationId: String(event.data.organizationId),
          status: { in: ["OPEN", "IN_PROGRESS"] },
          slaDueAt,
        },
      });
      if (!row) return { skipped: true };
      const access = await getEntitlements(row.organizationId).catch(() => null);
      if (!access?.entitlements.advancedCommunication) return { skipped: true };
      const recipients = row.assignedToId
        ? [row.assignedToId]
        : (
            await prisma.user.findMany({
              where: {
                organizationId: row.organizationId,
                active: true,
                role: { in: ["ADMIN", "MANAGER"] },
              },
              select: { id: true },
            })
          ).map((user) => user.id);
      if (!recipients.length) return { skipped: true };
      const queued = await prisma.$transaction(async (tx) => {
        await tx.auditLog.create({
          data: {
            organizationId: row.organizationId,
            action: "COMPLAINT_SLA_ESCALATE",
            entity: "Complaint",
            entityId: row.id,
          },
        });
        return enqueueNotificationEvent(tx, {
          organizationId: row.organizationId,
          eventKey: `complaint-sla:${row.id}:${slaDueAt.toISOString()}`,
          eventType: "complaint.sla_exceeded",
          aggregateType: "Complaint",
          aggregateId: row.id,
          payload: {
            recipients,
            notificationType: "COMPLAINT_SLA",
            title: `SLA dépassé : ${row.reference}`,
            message: row.subject,
            entityType: "Complaint",
            entityId: row.id,
            channels: ["IN_APP", "EMAIL"],
          },
        });
      });
      await processOutboxEvent(queued.id);
      await processPendingEmailDeliveries(50);
      return { notified: recipients.length };
    });
  },
);

export const absenceStartFollowup = inngest.createFunction(
  {
    id: "absence-start-followup",
    retries: 3,
    triggers: { event: "absence/approved" },
  },
  async ({ event, step }) => {
    await step.sleepUntil("wait-until-start", new Date(String(event.data.startDate)));
    return step.run("notify-absence-start", async () => {
      const row = await prisma.absenceRequest.findFirst({
        where: {
          id: String(event.data.absenceRequestId),
          organizationId: String(event.data.organizationId),
          status: "APPROVED",
        },
        include: { parent: true, child: true },
      });
      if (!row?.parent.userId) return { skipped: true };
      const queued = await prisma.$transaction((tx) =>
        enqueueNotificationEvent(tx, {
          organizationId: row.organizationId,
          eventKey: `absence-start:${row.id}:${row.startDate.toISOString()}`,
          eventType: "absence.started",
          aggregateType: "AbsenceRequest",
          aggregateId: row.id,
          payload: {
            recipients: [row.parent.userId!],
            notificationType: "ABSENCE_START",
            title: `Absence de ${row.child.firstName}`,
            message: "L'absence approuvée commence aujourd'hui.",
            entityType: "AbsenceRequest",
            entityId: row.id,
          },
        }),
      );
      await processOutboxEvent(queued.id);
      return { notified: true };
    });
  },
);

export const homeworkDueReminder = inngest.createFunction(
  {
    id: "homework-due-reminder",
    retries: 3,
    triggers: { event: "homework/published" },
  },
  async ({ event, step }) => {
    const due = new Date(String(event.data.dueDate));
    const remindAt = new Date(Math.max(Date.now(), due.getTime() - 24 * 60 * 60 * 1_000));
    await step.sleepUntil("wait-until-reminder", remindAt);
    return step.run("notify-parents", async () => {
      const homework = await prisma.homework.findFirst({
        where: {
          id: String(event.data.homeworkId),
          organizationId: String(event.data.organizationId),
          status: "PUBLISHED",
          active: true,
        },
        include: { assignments: true },
      });
      if (!homework) return { skipped: true };
      const access = await getEntitlements(homework.organizationId).catch(() => null);
      if (!access?.entitlements.homework) return { skipped: true };
      const childIds = homework.assignments.length
        ? homework.assignments.filter((item) => item.required).map((item) => item.childId)
        : (
            await prisma.child.findMany({
              where: {
                organizationId: homework.organizationId,
                classId: homework.classId,
                active: true,
              },
              select: { id: true },
            })
          ).map((child) => child.id);
      const recipients = await prisma.$transaction((tx) =>
        parentUserIdsForChildren(tx, homework.organizationId, childIds),
      );
      if (!recipients.length) return { skipped: true };
      const queued = await prisma.$transaction((tx) =>
        enqueueNotificationEvent(tx, {
          organizationId: homework.organizationId,
          eventKey: `homework-due:${homework.id}:${due.toISOString()}`,
          eventType: "homework.due",
          aggregateType: "Homework",
          aggregateId: homework.id,
          payload: {
            recipients,
            notificationType: "HOMEWORK_DUE",
            title: `Devoir bientôt dû : ${homework.title}`,
            message: `Échéance : ${due.toLocaleDateString("fr-MA")}`,
            entityType: "Homework",
            entityId: homework.id,
          },
        }),
      );
      await processOutboxEvent(queued.id);
      return { notified: recipients.length };
    });
  },
);
