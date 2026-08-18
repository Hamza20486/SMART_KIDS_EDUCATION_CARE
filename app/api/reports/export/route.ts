import { NextResponse } from "next/server";
import { requirePermission, authorizedClassIds } from "@/lib/permissions";
import { assertClassAccess } from "@/lib/policies";
import { apiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { reportRange } from "@/lib/reports/range";
import { operationalReport } from "@/lib/reports/operational";
import { financialReport } from "@/lib/reports/financial";
import { platformReport } from "@/lib/reports/platform";
import {
  csvExport,
  pdfTableExport,
  xlsxExport,
  type ExportTable,
} from "@/lib/reports/export";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import {
  createTranslator,
  localizePaymentMethod,
  localizeStatus,
} from "@/lib/i18n";
import { formatDate, formatMoney } from "@/lib/i18n/format";

function responseFor(format: string, table: ExportTable, filename: string) {
  if (format === "csv") {
    return new NextResponse(csvExport(table), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  }
  if (format === "xlsx") {
    return xlsxExport(table).then(
      (data) =>
        new NextResponse(data, {
          headers: {
            "content-type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "content-disposition": `attachment; filename="${filename}.xlsx"`,
            "cache-control": "private, no-store",
          },
        }),
    );
  }
  return pdfTableExport(table).then(
    (data) =>
      new NextResponse(data, {
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename="${filename}.pdf"`,
          "cache-control": "private, no-store",
        },
      }),
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "operational";
    const format = url.searchParams.get("format") ?? "csv";
    if (!["operational", "financial", "platform"].includes(kind)) {
      return NextResponse.json({ error: "Invalid report kind" }, { status: 400 });
    }
    if (!["csv", "xlsx", "pdf"].includes(format)) {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
    }
    const localeInput = url.searchParams.get("locale");
    const locale = isLocale(localeInput) ? localeInput : defaultLocale;
    const t = createTranslator(locale);
    const classId = url.searchParams.get("classId");
    let table: ExportTable;
    let filename: string;
    let context;
    let count = 0;
    let rangeMetadata: Record<string, string> = {};

    if (kind === "platform") {
      context = await requirePermission("platform.manage");
      const report = await platformReport();
      table = {
        title: t("reports.platformTitle"),
        headers: [
          t("subscriptions.organization"),
          t("subscriptions.city"),
          t("subscriptions.plan"),
          t("common.status"),
          t("reports.trialEnd"),
          t("reports.periodEnd"),
          t("reports.expiringSoon"),
          t("subscriptions.usageChildren"),
          t("subscriptions.usageStaff"),
          t("reports.storageMb"),
        ],
        rows: report.organizations.map((row) => [
          row.name,
          row.city,
          row.planName,
          localizeStatus(t, row.status),
          row.trialEndsAt ? formatDate(locale, row.trialEndsAt) : "",
          row.currentPeriodEnd ? formatDate(locale, row.currentPeriodEnd) : "",
          row.expiringSoon ? t("common.yes") : t("common.no"),
          `${row.children}/${row.childLimit || "—"}`,
          `${row.staff}/${row.staffLimit || "—"}`,
          `${Math.round((row.storageBytes / 1_048_576) * 10) / 10}/${row.storageLimitBytes ? Math.round((row.storageLimitBytes / 1_048_576) * 10) / 10 : "—"}`,
        ]),
      };
      filename = "smart-kids-platform-report";
      count = report.organizations.length;
    } else {
      const range = reportRange(url);
      rangeMetadata = { from: range.fromKey, to: range.toKey };
      if (kind === "operational") {
        context = await requirePermission("reports.operational");
        if (classId) await assertClassAccess(context, classId);
        const report = await operationalReport({
          organizationId: context.organizationId,
          from: range.from,
          to: range.to,
          classId,
          authorizedClassIds: await authorizedClassIds(context),
        });
        table = {
          title: t("reports.operationalTitle"),
          headers: [
            t("reports.section"),
            t("common.date"),
            t("common.name"),
            t("common.class"),
            t("common.status"),
            t("reports.total"),
            t("attendance.present"),
            t("attendance.absent"),
            t("attendance.late"),
            t("reports.rate"),
            t("common.note"),
          ],
          rows: [
            [t("reports.summary"), "", t("reports.attendanceRecords"), "", "", report.summary.attendanceRecords, "", "", "", "", ""],
            [t("reports.summary"), "", t("reports.absenceRate"), "", "", "", "", "", "", `${report.summary.absenceRate}%`, ""],
            [t("reports.summary"), "", t("reports.lateRate"), "", "", "", "", "", "", `${report.summary.lateRate}%`, ""],
            [t("reports.summary"), "", t("reports.absenceRequests"), "", "", report.summary.absenceRequests, "", "", "", "", ""],
            [t("reports.summary"), "", t("reports.homeworkCompletion"), "", "", "", "", "", "", `${report.summary.homeworkCompletionRate}%`, ""],
            [t("reports.summary"), "", t("reports.complaintResolution"), "", "", report.summary.complaints, report.summary.complaintsResolved, "", "", "", t("reports.hours", { count: report.summary.averageComplaintResolutionHours })],
            ...report.exportRows.map((row) => [
              t("navigation.attendance"),
              formatDate(locale, row.date),
              row.child,
              row.className,
              localizeStatus(t, row.status),
              "",
              "",
              "",
              "",
              "",
              [
                row.arrivalAt ? `${t("attendance.arrival")}: ${formatDate(locale, row.arrivalAt, { timeStyle: "short" })}` : "",
                row.departureAt ? `${t("attendance.departure")}: ${formatDate(locale, row.departureAt, { timeStyle: "short" })}` : "",
                row.pickup ? `${t("parent.authorizedPerson")}: ${row.pickup}` : "",
                row.note,
              ].filter(Boolean).join(" · "),
            ]),
            ...report.attendanceByDate.map((row) => [t("reports.byDate"), formatDate(locale, new Date(`${row.date}T00:00:00.000Z`)), "", "", "", row.total, row.present, row.absent, row.late, `${row.absenceRate}% / ${row.lateRate}%`, ""]),
            ...report.attendanceByClass.map((row) => [t("reports.byClass"), "", row.className, row.className, "", row.total, row.present, row.absent, row.late, `${row.absenceRate}% / ${row.lateRate}%`, ""]),
            ...report.attendanceByChild.map((row) => [t("reports.byChild"), "", row.childName, "", "", row.total, row.present, row.absent, row.late, `${row.attendanceRate}%`, ""]),
            ...report.absenceRequests.map((row) => [t("reports.absenceRequests"), formatDate(locale, row.startDate), row.childName, "", localizeStatus(t, row.status), "", "", "", "", "", formatDate(locale, row.endDate)]),
            ...report.teacherActivity.map((row) => [t("reports.teacherActivity"), "", row.name, "", "", row.activities + row.homework, row.activities, row.homework, "", "", ""]),
            ...report.homeworkCompletion.map((row) => [t("reports.homeworkSection"), formatDate(locale, row.dueDate), row.title, row.className, "", row.eligible, row.submitted, "", row.late, `${row.completionRate}%`, ""]),
            ...report.pickupActivity.map((row) => [t("reports.pickupActivity"), "", row.name, "", "", row.count, "", "", "", "", ""]),
            ...report.classUtilization.map((row) => [t("reports.classUtilization"), "", row.className, row.className, "", row.capacity, row.children, "", "", `${row.utilizationRate}%`, ""]),
          ],
        };
        filename = `smart-kids-operational-${range.fromKey}-${range.toKey}`;
        count = table.rows.length;
      } else {
        context = await requirePermission("reports.financial");
        if (classId) await assertClassAccess(context, classId);
        const report = await financialReport({
          organizationId: context.organizationId,
          from: range.from,
          to: range.to,
          classId,
        });
        table = {
          title: t("reports.financialTitle"),
          headers: [
            t("reports.section"),
            t("reports.count"),
            t("common.child"),
            t("common.parent"),
            t("common.class"),
            t("common.category"),
            t("common.period"),
            t("payments.gross"),
            t("payments.discount"),
            t("payments.net"),
            t("payments.paid"),
            t("payments.remaining"),
            t("homework.due"),
            t("common.status"),
            t("common.reference"),
          ],
          rows: [
            [t("reports.summary"), "", t("reports.billedGross"), "", "", "", "", formatMoney(locale, report.summary.billedGrossCentimes)],
            [t("reports.summary"), "", t("payments.discount"), "", "", "", "", "", formatMoney(locale, report.summary.discountsCentimes)],
            [t("reports.summary"), "", t("reports.billedNet"), "", "", "", "", "", "", formatMoney(locale, report.summary.billedNetCentimes)],
            [t("reports.summary"), report.summary.transactions, t("reports.collected"), "", "", "", "", "", "", "", formatMoney(locale, report.summary.collectedCentimes)],
            [t("reports.summary"), "", t("reports.outstanding"), "", "", "", "", "", "", "", "", formatMoney(locale, report.summary.currentOutstandingCentimes)],
            [t("reports.summary"), report.summary.partialPayments, t("reports.partialPayments")],
            [t("reports.summary"), report.summary.voidedReceipts, t("reports.voidedReceipts")],
            [t("reports.summary"), report.summary.reissuedReceipts, t("reports.reissuedReceipts")],
            ...Object.entries(report.statusCounts).map(([status, value]) => [t("common.status"), value, "", "", "", "", "", "", "", "", "", "", "", localizeStatus(t, status), ""]),
            ...report.revenueByMonth.map((row) => [t("reports.revenueMonth"), "", "", "", "", "", row.month, "", "", formatMoney(locale, row.amountCentimes)]),
            ...report.revenueByMethod.map((row) => [t("reports.revenueMethod"), "", localizePaymentMethod(t, row.method), "", "", "", "", "", "", formatMoney(locale, row.amountCentimes)]),
            ...report.outstandingByChild.map((row) => [t("reports.outstandingChild"), "", row.childName, "", row.className, "", "", "", "", "", "", formatMoney(locale, row.amountCentimes)]),
            ...report.outstandingByClass.map((row) => [t("reports.outstandingClass"), "", "", "", row.className, "", "", "", "", "", "", formatMoney(locale, row.amountCentimes)]),
            ...report.receiptActivity.map((row) => [
              t("reports.receiptActivity"),
              "",
              row.childName,
              "",
              "",
              row.reissued ? t("reports.reissued") : "",
              "",
              "",
              "",
              "",
              "",
              "",
              formatDate(locale, row.issuedAt),
              localizeStatus(t, row.status),
              `${row.receiptNumber}${row.voidedAt ? ` · ${t("reports.voidedAt")}: ${formatDate(locale, row.voidedAt)}` : ""}`,
            ]),
            ...report.exportRows.map((row) => [
              t("navigation.payments"),
              "",
              row.child,
              row.parent,
              row.className,
              row.category,
              row.academicPeriod,
              formatMoney(locale, row.grossCentimes),
              formatMoney(locale, row.discountCentimes),
              formatMoney(locale, row.netCentimes),
              formatMoney(locale, row.paidCentimes),
              formatMoney(locale, row.outstandingCentimes),
              formatDate(locale, row.dueDate),
              localizeStatus(t, row.status),
              row.reference,
            ]),
          ],
        };
        filename = `smart-kids-financial-${range.fromKey}-${range.toKey}`;
        count = table.rows.length;
      }
    }

    await audit(context, "EXPORT", "Report", kind, {
      format,
      count,
      classId,
      ...rangeMetadata,
    });
    return await responseFor(format, table, filename);
  } catch (error) {
    return apiError(error);
  }
}
