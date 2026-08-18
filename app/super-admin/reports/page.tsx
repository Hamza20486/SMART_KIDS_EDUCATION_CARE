import Link from "next/link";
import { requirePermission } from "@/lib/permissions";
import { platformReport } from "@/lib/reports/platform";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import { localizeStatus } from "@/lib/i18n";
import { PrintReportButton } from "@/components/report-actions";

export const dynamic = "force-dynamic";

export default async function PlatformReportsPage() {
  await requirePermission("platform.manage");
  const [report, t, locale] = await Promise.all([
    platformReport(),
    getTranslations(),
    getLocale(),
  ]);
  return (
    <>
      <div className="pagehead">
        <div><h1>{t("reports.platformTitle")}</h1><p className="muted">{t("reports.usage")}</p></div>
        <div className="nav no-print">
          <Link className="button secondary" href="/super-admin">{t("common.back")}</Link>
          {(["csv", "xlsx", "pdf"] as const).map((format) => (
            <a
              className="button"
              key={format}
              href={`/api/reports/export?kind=platform&format=${format}&locale=${locale}`}
            >
              {format.toUpperCase()}
            </a>
          ))}
          <PrintReportButton />
        </div>
      </div>

      <div className="grid report-summary">
        <div className="card stat"><span>{t("reports.organizations")}</span><strong>{report.summary.organizations}</strong></div>
        <div className="card stat"><span>{t("reports.activeTrials")}</span><strong>{report.summary.activeTrials}</strong></div>
        <div className="card stat"><span>{t("reports.expiringSoon")}</span><strong>{report.summary.expiringSoon}</strong></div>
        <div className="card stat"><span>{t("reports.suspended")}</span><strong>{report.summary.suspended}</strong></div>
        <div className="card stat"><span>{t("subscriptions.usageChildren")}</span><strong>{report.summary.totalChildren}</strong></div>
        <div className="card stat"><span>{t("subscriptions.usageStaff")}</span><strong>{report.summary.totalStaff}</strong></div>
        <div className="card stat"><span>{t("subscriptions.storage")}</span><strong>{(report.summary.totalStorageBytes / 1_048_576).toFixed(1)} MB</strong></div>
      </div>

      <h2>{t("reports.byPlan")}</h2>
      <div className="grid">
        {Object.entries(report.planCounts).map(([plan, count]) => (
          <div className="card stat" key={plan}><span>{plan === "UNCONFIGURED" ? t("reports.noPlan") : plan}</span><strong>{count}</strong></div>
        ))}
      </div>

      <h2>{t("reports.usage")}</h2>
      <table className="table">
        <thead><tr>
          <th>{t("subscriptions.organization")}</th>
          <th>{t("subscriptions.plan")}</th>
          <th>{t("common.status")}</th>
          <th>{t("subscriptions.usageChildren")}</th>
          <th>{t("subscriptions.usageStaff")}</th>
          <th>{t("subscriptions.storage")}</th>
          <th>{t("homework.due")}</th>
          <th>{t("reports.expiringSoon")}</th>
        </tr></thead>
        <tbody>
          {report.organizations.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.planName ?? "—"}</td>
              <td>{localizeStatus(t, row.status)}</td>
              <td>{row.children}/{row.childLimit || "—"}</td>
              <td>{row.staff}/{row.staffLimit || "—"}</td>
              <td>
                {(row.storageBytes / 1_048_576).toLocaleString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-MA" : "fr-MA", { maximumFractionDigits: 1 })}/
                {row.storageLimitBytes ? (row.storageLimitBytes / 1_048_576).toLocaleString(locale === "ar" ? "ar-MA" : locale === "en" ? "en-MA" : "fr-MA", { maximumFractionDigits: 1 }) : "—"} MB
              </td>
              <td>
                {row.trialEndsAt
                  ? formatDate(locale, row.trialEndsAt)
                  : row.currentPeriodEnd
                    ? formatDate(locale, row.currentPeriodEnd)
                    : "—"}
              </td>
              <td>{row.expiringSoon ? t("common.yes") : t("common.no")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
