import { localizeStatus } from "@/lib/i18n";
import { getTranslations } from "@/lib/i18n/server";
import { requirePermission } from "@/lib/permissions";
import { notificationsRepository } from "@/lib/repositories/notifications";
import { ActionButton } from "@/components/resource-actions";

export const dynamic = "force-dynamic";

export default async function NotificationDeliveriesPage() {
  const t = await getTranslations();
  const context = await requirePermission("settings.manage");
  const { deliveries, failedEvents, statusCounts } =
    await notificationsRepository.deliveryHealth(context);
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("notifications.deliveryTitle")}</h1>
          <p className="muted">{t("notifications.deliverySubtitle")}</p>
        </div>
      </div>
      <div className="grid" style={{ marginBottom: 24 }}>
        {statusCounts.map((item) => (
          <div className="card stat" key={localizeStatus(t,item.status)}>
            <span>{localizeStatus(t,item.status)}</span>
            <strong>{item._count._all}</strong>
          </div>
        ))}
      </div>

      <h2>{t("notifications.recentDeliveries")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>{t("common.date")}</th>
            <th>{t("notifications.recipient")}</th>
            <th>{t("common.type")}</th>
            <th>{t("notifications.channel")}</th>
            <th>{t("common.status")}</th>
            <th>{t("notifications.attempts")}</th>
            <th>{t("notifications.error")}</th>
            <th>{t("common.action")}</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr key={delivery.id}>
              <td>{delivery.createdAt.toLocaleString("fr-MA")}</td>
              <td>
                {delivery.notification.user.name}
                <br />
                <span className="muted">{delivery.notification.user.email}</span>
              </td>
              <td>{delivery.notification.type}</td>
              <td>{delivery.channel}</td>
              <td>{localizeStatus(t,delivery.status)}</td>
              <td>{delivery.attempts}/{delivery.maxAttempts}</td>
              <td>{delivery.lastError || "—"}</td>
              <td>
                {delivery.status === "FAILED" && (
                  <ActionButton
                    endpoint="/api/admin/notification-retries"
                    method="POST"
                    label="Réessayer"
                    body={{ kind: "delivery", id: delivery.id }}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 36 }}>{t("notifications.failedEvents")}</h2>
      <table className="table">
        <thead>
          <tr>
            <th>{t("common.date")}</th>
            <th>{t("common.type")}</th>
            <th>{t("notifications.aggregate")}</th>
            <th>{t("notifications.attempts")}</th>
            <th>{t("notifications.error")}</th>
            <th>{t("common.action")}</th>
          </tr>
        </thead>
        <tbody>
          {failedEvents.length === 0 ? (
            <tr><td colSpan={6}>{t("notifications.noFailedEvents")}</td></tr>
          ) : (
            failedEvents.map((event) => (
              <tr key={event.id}>
                <td>{event.occurredAt.toLocaleString("fr-MA")}</td>
                <td>{event.type}</td>
                <td>{event.aggregateType} — {event.aggregateId}</td>
                <td>{event.attempts}</td>
                <td>{event.lastError || "—"}</td>
                <td>
                  <ActionButton
                    endpoint="/api/admin/notification-retries"
                    method="POST"
                    label="Réessayer"
                    body={{ kind: "outbox", id: event.id }}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
