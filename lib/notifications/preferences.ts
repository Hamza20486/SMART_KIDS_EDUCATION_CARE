import { NOTIFICATION_TYPES, type NotificationType } from "./catalog";

export const editableNotificationTypes = NOTIFICATION_TYPES.filter(
  (type) => !["ACCOUNT_LOCKED", "PASSWORD_CHANGED", "PASSWORD_RESET"].includes(type),
);

export function isEditableNotificationType(value: string): value is NotificationType {
  return editableNotificationTypes.includes(value as NotificationType);
}
