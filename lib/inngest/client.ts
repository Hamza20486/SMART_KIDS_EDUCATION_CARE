import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "smart-kids-education-care",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

function canSendEvents() {
  return Boolean(process.env.INNGEST_EVENT_KEY) || process.env.NODE_ENV === "development";
}

export async function wakeNotificationWorker(outboxEventId: string) {
  if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV === "development") {
    const { processOutboxEvent, processPendingEmailDeliveries } = await import(
      "../notifications/processor"
    );
    const result = await processOutboxEvent(outboxEventId);
    await processPendingEmailDeliveries(20);
    return result;
  }
  if (!canSendEvents()) return null;
  try {
    return await inngest.send({
      name: "notification/outbox.dispatch",
      data: { outboxEventId },
    });
  } catch (error) {
    // The database outbox is authoritative; the scheduled sweeper will recover
    // this event even when the immediate wake-up request is unavailable.
    console.error("Unable to wake notification worker", error);
    return null;
  }
}

export async function scheduleHomeworkReminder(data: {
  organizationId: string;
  homeworkId: string;
  dueDate: string;
}) {
  if (!canSendEvents()) return null;
  return inngest.send({ name: "homework/published", data });
}

export async function scheduleAbsenceFollowup(data: {
  organizationId: string;
  absenceRequestId: string;
  startDate: string;
}) {
  if (!canSendEvents()) return null;
  return inngest.send({ name: "absence/approved", data });
}

export async function scheduleComplaintEscalation(data: {
  organizationId: string;
  complaintId: string;
  slaDueAt: Date;
}) {
  if (!canSendEvents()) return null;
  return inngest.send({
    name: "complaint/opened",
    data: { ...data, slaDueAt: data.slaDueAt.toISOString() },
  });
}
