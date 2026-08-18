import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { fr } from "./messages/fr";
import type { Locale } from "./config";

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;
export const messages: Record<Locale, Messages> = { fr, ar, en };

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: Record<string, string | number>,
) {
  let value: string = messages[locale][key] ?? fr[key] ?? key;
  for (const [name, replacement] of Object.entries(values ?? {})) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export function createTranslator(locale: Locale) {
  return (key: MessageKey, values?: Record<string, string | number>) =>
    translate(locale, key, values);
}

const statusKeys: Record<string, MessageKey> = {
  TRIAL: "status.trial",
  ACTIVE: "status.active",
  PAST_DUE: "status.pastDue",
  SUSPENDED: "status.suspended",
  UNCONFIGURED: "status.unconfigured",
  OPEN: "status.open",
  IN_PROGRESS: "status.inProgress",
  RESOLVED: "status.resolved",
  CLOSED: "status.closed",
  PENDING: "status.pending",
  PARTIAL: "status.partial",
  PAID: "status.paid",
  OVERDUE: "status.overdue",
  CANCELLED: "status.cancelled",
  ISSUED: "status.issued",
  VOID: "status.void",
  PRESENT: "attendance.present",
  ABSENT: "attendance.absent",
  LATE: "attendance.late",
  EXCUSED: "attendance.excused",
  APPROVED: "staff.approved",
  REJECTED: "staff.rejected",
  DRAFT: "homework.draft",
  PUBLISHED: "homework.published",
};

export function statusMessageKey(status: string) {
  return statusKeys[status];
}

export function localizeStatus(
  t: (key: MessageKey) => string,
  status: string,
) {
  const key = statusMessageKey(status);
  return key ? t(key) : status;
}

const paymentMethodKeys: Record<string, MessageKey> = {
  CASH: "payments.cash",
  BANK_TRANSFER: "payments.transfer",
  CHEQUE: "payments.cheque",
  CARD_MANUAL: "payments.manualCard",
  OTHER: "payments.other",
};

export function localizePaymentMethod(
  t: (key: MessageKey) => string,
  method: string,
) {
  const key = paymentMethodKeys[method];
  return key ? t(key) : method;
}
