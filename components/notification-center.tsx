"use client";

import { clientTranslate } from "@/lib/i18n/client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { formatDateTime } from "@/lib/i18n/format";
import type { MessageKey } from "@/lib/i18n";
import {
  Bell,
  CheckCheck,
  Check,
  Inbox,
  Loader2,
  Sliders,
} from "lucide-react";

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

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: "var(--muted)" }}>
        <Loader2 size={24} className="animate-spin" style={{ marginRight: 10 }} />
        <span>{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <>
      <div className="pagehead">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "var(--brand-light)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>{t("notifications.title")}</h1>
            <p className="muted" style={{ margin: "2px 0 0" }}>
              {t("notifications.unread", { count: unreadCount })}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="button secondary"
            onClick={() => markRead()}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <CheckCheck size={16} /> {t("notifications.markAll")}
          </button>
        )}
      </div>

      <section aria-label="Notifications récentes" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
            <Inbox size={36} strokeWidth={1.5} style={{ margin: "0 auto 10px" }} />
            <p>{t("notifications.empty")}</p>
          </div>
        ) : (
          rows.map((row) => (
            <article
              className="card"
              key={row.id}
              style={{
                padding: 18,
                borderRadius: 16,
                borderLeft: row.readAt ? "1px solid var(--line)" : "4px solid var(--brand)",
                background: row.readAt ? "white" : "linear-gradient(90deg, rgba(255,94,58,0.03), white)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge" style={{ fontSize: 11 }}>
                    {labels[row.type] ? t(labels[row.type]) : row.type}
                  </span>
                  <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>{row.title}</h2>
                </div>
                <time className="muted" dateTime={row.createdAt} style={{ fontSize: 12 }}>
                  {formatDateTime(locale, row.createdAt)}
                </time>
              </div>

              <p style={{ margin: "6px 0 10px", fontSize: 14, color: "var(--ink-light)" }}>{row.message}</p>

              {!row.readAt && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => markRead([row.id])}
                  style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <Check size={13} /> {t("notifications.markRead")}
                </button>
              )}
            </article>
          ))
        )}
      </section>

      <section style={{ marginTop: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sliders size={20} color="var(--brand)" />
          <h2 style={{ margin: 0, fontSize: 18 }}>{t("notifications.preferences")}</h2>
        </div>
        <p className="muted" style={{ marginBottom: 16 }}>
          {t("notifications.securityAlways")}
        </p>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{t("common.action")}</th>
                <th style={{ textAlign: "center" }}>{t("notifications.inApp")}</th>
                <th style={{ textAlign: "center" }}>{t("common.email")}</th>
              </tr>
            </thead>
            <tbody>
              {preferences.map((preference) => (
                <tr key={preference.type}>
                  <td>
                    <strong>{labels[preference.type] ? t(labels[preference.type]) : preference.type}</strong>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      aria-label={`${labels[preference.type] ? t(labels[preference.type]) : preference.type} dans l'application`}
                      type="checkbox"
                      checked={preference.inAppEnabled}
                      onChange={(event) =>
                        updatePreference(preference, {
                          inAppEnabled: event.target.checked,
                        })
                      }
                      style={{ cursor: "pointer", width: 18, height: 18 }}
                    />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      aria-label={`${labels[preference.type] ? t(labels[preference.type]) : preference.type} par email`}
                      type="checkbox"
                      checked={preference.emailEnabled}
                      onChange={(event) =>
                        updatePreference(preference, {
                          emailEnabled: event.target.checked,
                        })
                      }
                      style={{ cursor: "pointer", width: 18, height: 18 }}
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
