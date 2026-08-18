import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/policies";
import { reportRange } from "@/lib/reports/range";
import { financialReport } from "@/lib/reports/financial";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate, formatMoney } from "@/lib/i18n/format";
import { localizePaymentMethod, localizeStatus } from "@/lib/i18n";
import { PrintReportButton } from "@/components/report-actions";

export const dynamic = "force-dynamic";

export default async function FinancialReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; classId?: string }>;
}) {
  const context = await requirePermission("reports.financial");
  const [params, t, locale] = await Promise.all([
    searchParams,
    getTranslations(),
    getLocale(),
  ]);
  const url = new URL("http://reports.local");
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  const range = reportRange(url);
  if (params.classId) await assertClassAccess(context, params.classId);
  const [report, classes] = await Promise.all([
    financialReport({
      organizationId: context.organizationId,
      from: range.from,
      to: range.to,
      classId: params.classId,
    }),
    prisma.classRoom.findMany({
      where: { organizationId: context.organizationId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const exportQuery = new URLSearchParams({
    kind: "financial",
    from: range.fromKey,
    to: range.toKey,
    locale,
    ...(params.classId ? { classId: params.classId } : {}),
  });
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("reports.financialTitle")}</h1>
          <p className="muted">{range.fromKey} — {range.toKey}</p>
        </div>
        <div className="nav no-print">
          <Link className="button secondary" href="/admin/payments">{t("common.back")}</Link>
          {(["csv", "xlsx", "pdf"] as const).map((format) => (
            <a className="button" key={format} href={`/api/reports/export?${exportQuery.toString()}&format=${format}`}>
              {format.toUpperCase()}
            </a>
          ))}
          <PrintReportButton />
        </div>
      </div>

      <form className="searchbar no-print">
        <label>{t("reports.from")} <input type="date" name="from" defaultValue={range.fromKey} /></label>
        <label>{t("reports.to")} <input type="date" name="to" defaultValue={range.toKey} /></label>
        <label>
          {t("common.class")} {" "}
          <select name="classId" defaultValue={params.classId ?? ""}>
            <option value="">{t("common.all")}</option>
            {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button className="button">{t("common.display")}</button>
      </form>

      <div className="grid report-summary">
        <div className="card stat"><span>{t("reports.billedGross")}</span><strong>{formatMoney(locale, report.summary.billedGrossCentimes)}</strong></div>
        <div className="card stat"><span>{t("payments.discount")}</span><strong>{formatMoney(locale, report.summary.discountsCentimes)}</strong></div>
        <div className="card stat"><span>{t("reports.billedNet")}</span><strong>{formatMoney(locale, report.summary.billedNetCentimes)}</strong></div>
        <div className="card stat"><span>{t("reports.collected")}</span><strong>{formatMoney(locale, report.summary.collectedCentimes)}</strong></div>
        <div className="card stat"><span>{t("reports.outstanding")}</span><strong>{formatMoney(locale, report.summary.currentOutstandingCentimes)}</strong></div>
        <div className="card stat"><span>{t("reports.collectionRate")}</span><strong>{report.summary.collectionRate}%</strong></div>
        <div className="card stat"><span>{t("reports.partialPayments")}</span><strong>{report.summary.partialPayments}</strong></div>
        <div className="card stat"><span>{t("reports.voidedReceipts")}</span><strong>{report.summary.voidedReceipts}</strong></div>
        <div className="card stat"><span>{t("reports.reissuedReceipts")}</span><strong>{report.summary.reissuedReceipts}</strong></div>
      </div>

      <h2>{t("common.status")}</h2>
      <div className="grid">
        {Object.entries(report.statusCounts).map(([status, count]) => (
          <div className="card stat" key={status}>
            <span>{localizeStatus(t, status)}</span><strong>{Number(count)}</strong>
          </div>
        ))}
      </div>

      <div className="grid report-sections">
        <section className="card">
          <h2>{t("reports.revenueMonth")}</h2>
          {report.revenueByMonth.map((row) => <p key={row.month}>{row.month}: {formatMoney(locale, row.amountCentimes)}</p>)}
        </section>
        <section className="card">
          <h2>{t("reports.revenueMethod")}</h2>
          {report.revenueByMethod.map((row) => <p key={row.method}>{localizePaymentMethod(t, row.method)}: {formatMoney(locale, row.amountCentimes)}</p>)}
        </section>
      </div>

      <h2>{t("reports.outstandingChild")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.child")}</th><th>{t("common.class")}</th><th>{t("common.amount")}</th></tr></thead>
        <tbody>{report.outstandingByChild.map((row) => <tr key={row.childId}><td>{row.childName}</td><td>{row.className}</td><td>{formatMoney(locale, row.amountCentimes)}</td></tr>)}</tbody>
      </table>

      <h2>{t("reports.outstandingClass")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.class")}</th><th>{t("common.amount")}</th></tr></thead>
        <tbody>{report.outstandingByClass.map((row) => <tr key={row.className}><td>{row.className}</td><td>{formatMoney(locale, row.amountCentimes)}</td></tr>)}</tbody>
      </table>

      <h2>{t("reports.receiptActivity")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.reference")}</th><th>{t("common.child")}</th><th>{t("common.status")}</th><th>{t("reports.issuedAt")}</th><th>{t("reports.voidedAt")}</th><th>{t("reports.reissued")}</th></tr></thead>
        <tbody>{report.receiptActivity.map((row) => <tr key={row.id}><td>{row.receiptNumber}</td><td>{row.childName}</td><td>{localizeStatus(t, row.status)}</td><td>{formatDate(locale, row.issuedAt)}</td><td>{row.voidedAt ? formatDate(locale, row.voidedAt) : "—"}</td><td>{row.reissued ? t("common.yes") : t("common.no")}</td></tr>)}</tbody>
      </table>
    </>
  );
}
