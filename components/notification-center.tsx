"use client";
import { clientTranslate } from "@/lib/i18n/client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { formatDateTime } from "@/lib/i18n/format";
import type { MessageKey } from "@/lib/i18n";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

type Preference = {
  type: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

const labels: Record<string, MessageKey> = {
  ATTENDANCE_CHANGED: "notification.attendanceChanged",
  ARRIVAL_RECORDED: "notification.arrivalRecorded",
  DEPARTURE_RECORDED: "notification.departureRecorded",
  ACTIVITY_PUBLISHED: "notification.activityPublished",
  HOMEWORK_PUBLISHED: "notification.homeworkPublished",
  HOMEWORK_DUE: "notification.homeworkDue",
  HOMEWORK_REVIEW: "notification.homeworkReview",
  ABSENCE_SUBMITTED: "notification.absenceSubmitted",
  ABSENCE_DECISION: "notification.absenceDecision",
  ABSENCE_START: "notification.absenceStart",
  COMPLAINT_CREATED: "notification.complaintCreated",
  COMPLAINT_MESSAGE: "notification.complaintMessage",
  COMPLAINT_UPDATE: "notification.complaintUpdate",
  COMPLAINT_SLA: "notification.complaintSla",
  PAYMENT_DUE: "notification.paymentDue",
  PAYMENT_OVERDUE: "notification.paymentOverdue",
  PAYMENT_RECORDED: "notification.paymentRecorded",
  RECEIPT_ISSUED: "notification.receiptIssued",
  ANNOUNCEMENT: "notification.announcement",
  SUBSCRIPTION_STATUS: "notification.subscription",
};

export function NotificationCenter() {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [notificationResponse, preferenceResponse] = await Promise.all([
      fetch("/api/account/notifications", { cache: "no-store" }),
      fetch("/api/account/notification-preferences", { cache: "no-store" }),
    ]);
    if (!notificationResponse.ok || !preferenceResponse.ok) {
      throw new Error("Notifications unavailable");
    }
    const notificationData = (await notificationResponse.json()) as {
      notifications: NotificationRow[];
      unreadCount: number;
    };
    setRows(notificationData.notifications);
    setUnreadCount(notificationData.unreadCount);
    setPreferences((await preferenceResponse.json()) as Preference[]);
  }, []);

  useEffect(() => {
    load()
      .catch(() => toast.error(clientTranslate("common.retry")))
      .finally(() => setLoading(false));
  }, [load]);

  async function markRead(ids?: string[]) {
    const response = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    if (!response.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    await load();
  }

  async function updatePreference(
    preference: Preference,
    changes: Partial<Preference>,
  ) {
    const next = { ...preference, ...changes };
    setPreferences((current) =>
      current.map((item) => (item.type === next.type ? next : item)),
    );
    const response = await fetch("/api/account/notification-preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setPreferences((current) =>
        current.map((item) => (item.type === preference.type ? preference : item)),
      );
      toast.error(clientTranslate("common.retry"));
    }
  }

  if (loading) return <p>{t("common.loading")}</p>;

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("notifications.title")}</h1>
          <p className="muted">{t("notifications.unread", { count: unreadCount })}</p>
        </div>
        {unreadCount > 0 && (
          <button className="button secondary" onClick={() => markRead()}>
            {t("notifications.markAll")}
          </button>
        )}
      </div>

      <section aria-label="Notifications récentes">
        {rows.length === 0 ? (
          <div className="card"><p className="muted">{t("notifications.empty")}</p></div>
        ) : (
          rows.map((row) => (
            <article
              className="card"
              key={row.id}
              style={{
                marginBottom: 12,
                borderLeft: row.readAt ? undefined : "4px solid var(--brand)",
              }}
            >
              <div className="pagehead" style={{ marginBottom: 8 }}>
                <div>
                  <span className="badge">{labels[row.type] ? t(labels[row.type]) : row.type}</span>
                  <h2>{row.title}</h2>
                </div>
                <time className="muted" dateTime={row.createdAt}>
                  {formatDateTime(locale, row.createdAt)}
                </time>
              </div>
              <p>{row.message}</p>
              {!row.readAt && (
                <button className="button secondary" onClick={() => markRead([row.id])}>
                  {t("notifications.markRead")}
                </button>
              )}
            </article>
          ))
        )}
      </section>

      <section style={{ marginTop: 36 }}>
        <h2>{t("notifications.preferences")}</h2>
        <p className="muted">
          {t("notifications.securityAlways")}
        </p>
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t("common.action")}</th>
                <th>{t("notifications.inApp")}</th>
                <th>{t("common.email")}</th>
              </tr>
            </thead>
            <tbody>
              {preferences.map((preference) => (
                <tr key={preference.type}>
                  <td>{labels[preference.type] ? t(labels[preference.type]) : preference.type}</td>
                  <td>
                    <input
                      aria-label={`${labels[preference.type] ? t(labels[preference.type]) : preference.type} dans l'application`}
                      type="checkbox"
                      checked={preference.inAppEnabled}
                      onChange={(event) =>
                        updatePreference(preference, {
                          inAppEnabled: event.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`${labels[preference.type] ? t(labels[preference.type]) : preference.type} par email`}
                      type="checkbox"
                      checked={preference.emailEnabled}
                      onChange={(event) =>
                        updatePreference(preference, {
                          emailEnabled: event.target.checked,
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
