import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "ATTENDANCE_CHANGED",
  "ARRIVAL_RECORDED",
  "DEPARTURE_RECORDED",
  "ACTIVITY_PUBLISHED",
  "HOMEWORK_PUBLISHED",
  "HOMEWORK_DUE",
  "HOMEWORK_REVIEW",
  "ABSENCE_SUBMITTED",
  "ABSENCE_DECISION",
  "ABSENCE_START",
  "COMPLAINT_CREATED",
  "COMPLAINT_MESSAGE",
  "COMPLAINT_UPDATE",
  "COMPLAINT_SLA",
  "PAYMENT_DUE",
  "PAYMENT_OVERDUE",
  "PAYMENT_RECORDED",
  "RECEIPT_ISSUED",
  "ANNOUNCEMENT",
  "SUBSCRIPTION_STATUS",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type SupportedNotificationChannel = "IN_APP" | "EMAIL";

export const CRITICAL_NOTIFICATION_TYPES = new Set<NotificationType>([
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
]);

const emailByDefault = new Set<NotificationType>([
  "ABSENCE_DECISION",
  "COMPLAINT_MESSAGE",
  "COMPLAINT_UPDATE",
  "PAYMENT_DUE",
  "PAYMENT_OVERDUE",
  "PAYMENT_RECORDED",
  "RECEIPT_ISSUED",
  "ANNOUNCEMENT",
  "SUBSCRIPTION_STATUS",
  "ACCOUNT_LOCKED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
]);

export function defaultChannelsFor(type: NotificationType): SupportedNotificationChannel[] {
  return emailByDefault.has(type) ? ["IN_APP", "EMAIL"] : ["IN_APP"];
}

export const notificationPayloadSchema = z.object({
  recipients: z.array(z.string().min(1)).min(1).max(2_000).transform((values) => [...new Set(values)]),
  notificationType: z.enum(NOTIFICATION_TYPES),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5_000),
  entityType: z.string().trim().min(1).max(100).optional(),
  entityId: z.string().trim().min(1).max(200).optional(),
  channels: z.array(z.enum(["IN_APP", "EMAIL"])).min(1).optional(),
});

export type NotificationPayload = z.input<typeof notificationPayloadSchema>;
export type ParsedNotificationPayload = z.output<typeof notificationPayloadSchema>;

export function deliveryBackoffSeconds(attempt: number): number {
  return Math.min(60 * 60, 30 * 2 ** Math.max(0, attempt - 1));
}

export function deliveryChannels(input: {
  type: NotificationType;
  requested?: SupportedNotificationChannel[];
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
}): SupportedNotificationChannel[] {
  const requested = input.requested ?? ["IN_APP", "EMAIL"];
  const critical = CRITICAL_NOTIFICATION_TYPES.has(input.type);
  return requested.filter((channel) => {
    if (channel === "IN_APP") return critical || input.inAppEnabled !== false;
    return critical || input.emailEnabled !== false;
  });
}
