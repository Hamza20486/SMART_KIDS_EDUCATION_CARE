import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { authorizedClassIds, requirePermission } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/policies";
import { reportRange } from "@/lib/reports/range";
import { operationalReport } from "@/lib/reports/operational";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import { PrintReportButton } from "@/components/report-actions";

export const dynamic = "force-dynamic";

export default async function OperationalReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; classId?: string }>;
}) {
  const context = await requirePermission("reports.operational");
  const [params, t, locale] = await Promise.all([
    searchParams,
    getTranslations(),
    getLocale(),
  ]);
  const url = new URL("http://reports.local");
  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);
  if (params.classId) url.searchParams.set("classId", params.classId);
  const range = reportRange(url);
  if (params.classId) await assertClassAccess(context, params.classId);
  const authorizedIds = await authorizedClassIds(context);
  const [report, classes] = await Promise.all([
    operationalReport({
      organizationId: context.organizationId,
      from: range.from,
      to: range.to,
      classId: params.classId,
      authorizedClassIds: authorizedIds,
    }),
    prisma.classRoom.findMany({
      where: {
        organizationId: context.organizationId,
        active: true,
        ...(authorizedIds ? { id: { in: authorizedIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const exportQuery = new URLSearchParams({
    kind: "operational",
    from: range.fromKey,
    to: range.toKey,
    locale,
    ...(params.classId ? { classId: params.classId } : {}),
  });
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("reports.operationalTitle")}</h1>
          <p className="muted">{range.fromKey} — {range.toKey}</p>
        </div>
        <div className="nav no-print">
          {(["csv", "xlsx", "pdf"] as const).map((format) => (
            <a
              className="button"
              key={format}
              href={`/api/reports/export?${exportQuery.toString()}&format=${format}`}
            >
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
        <div className="card stat"><span>{t("staff.activeChildren")}</span><strong>{report.summary.activeChildren}</strong></div>
        <div className="card stat"><span>{t("reports.attendanceRecords")}</span><strong>{report.summary.attendanceRecords}</strong></div>
        <div className="card stat"><span>{t("reports.absenceRate")}</span><strong>{report.summary.absenceRate}%</strong></div>
        <div className="card stat"><span>{t("reports.lateRate")}</span><strong>{report.summary.lateRate}%</strong></div>
        <div className="card stat"><span>{t("reports.absenceRequests")}</span><strong>{report.summary.absenceRequests}</strong></div>
        <div className="card stat"><span>{t("reports.homeworkCompletion")}</span><strong>{report.summary.homeworkCompletionRate}%</strong></div>
        <div className="card stat"><span>{t("reports.complaintResolution")}</span><strong>{report.summary.complaintsResolved}/{report.summary.complaints}</strong></div>
        <div className="card stat"><span>{t("reports.averageResolution")}</span><strong>{t("reports.hours", { count: report.summary.averageComplaintResolutionHours })}</strong></div>
      </div>

      <h2>{t("reports.byDate")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.date")}</th><th>{t("reports.total")}</th><th>{t("attendance.present")}</th><th>{t("attendance.absent")}</th><th>{t("attendance.late")}</th><th>{t("reports.absenceRate")}</th><th>{t("reports.lateRate")}</th></tr></thead>
        <tbody>{report.attendanceByDate.map((row) => <tr key={row.date}><td>{formatDate(locale, new Date(`${row.date}T00:00:00.000Z`))}</td><td>{row.total}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.late}</td><td>{row.absenceRate}%</td><td>{row.lateRate}%</td></tr>)}</tbody>
      </table>

      <h2>{t("reports.byClass")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.class")}</th><th>{t("reports.total")}</th><th>{t("attendance.present")}</th><th>{t("attendance.absent")}</th><th>{t("attendance.late")}</th><th>{t("reports.absenceRate")}</th><th>{t("reports.lateRate")}</th></tr></thead>
        <tbody>{report.attendanceByClass.map((row) => <tr key={row.classId}><td>{row.className}</td><td>{row.total}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.late}</td><td>{row.absenceRate}%</td><td>{row.lateRate}%</td></tr>)}</tbody>
      </table>

      <h2>{t("reports.byChild")}</h2>
      <table className="table">
        <thead><tr><th>{t("common.child")}</th><th>{t("reports.total")}</th><th>{t("attendance.present")}</th><th>{t("attendance.absent")}</th><th>{t("attendance.late")}</th><th>{t("reports.rate")}</th></tr></thead>
        <tbody>{report.attendanceByChild.map((row) => <tr key={row.childId}><td>{row.childName}</td><td>{row.total}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.late}</td><td>{row.attendanceRate}%</td></tr>)}</tbody>
      </table>

      <div className="grid report-sections">
        <section className="card">
          <h2>{t("reports.teacherActivity")}</h2>
          {report.teacherActivity.map((row) => (
            <p key={row.userId}>{row.name}: {t("navigation.activities")} {row.activities} · {t("navigation.homework")} {row.homework}</p>
          ))}
        </section>
        <section className="card">
          <h2>{t("reports.homeworkSection")}</h2>
          {report.homeworkCompletion.map((row) => (
            <p key={row.id}>{row.title} — {row.className}: {row.submitted}/{row.eligible} ({row.completionRate}%)</p>
          ))}
        </section>
        <section className="card">
          <h2>{t("reports.pickupActivity")}</h2>
          {report.pickupActivity.map((row) => <p key={row.name}>{row.name}: {row.count}</p>)}
        </section>
        <section className="card">
          <h2>{t("reports.classUtilization")}</h2>
          {report.classUtilization.map((row) => (
            <p key={row.classId}>{row.className}: {row.children}/{row.capacity} ({row.utilizationRate}%)</p>
          ))}
        </section>
      </div>
      <p className="no-print"><Link href="/admin">{t("common.back")}</Link></p>
    </>
  );
}
