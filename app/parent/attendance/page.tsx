import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import type { MessageKey } from "@/lib/i18n";

export const dynamic = "force-dynamic";
const statusKeys: Record<string, MessageKey> = {
  PRESENT: "attendance.present",
  ABSENT: "attendance.absent",
  LATE: "attendance.late",
  EXCUSED: "attendance.excused",
};

export default async function ParentAttendancePage() {
  const user = await requireUser(["PARENT"]);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
  });
  const childIds = parent
    ? (
        await prisma.parentChild.findMany({
          where: { organizationId: user.organizationId, parentId: parent.id },
          select: { childId: true },
        })
      ).map((link) => link.childId)
    : [];
  const rows = await prisma.attendance.findMany({
    where: { organizationId: user.organizationId, childId: { in: childIds } },
    include: { child: true },
    orderBy: { date: "desc" },
  });
  return (
    <>
      <h1>{t("parent.attendanceTitle")}</h1>
      <table className="table">
        <thead><tr>
          <th>{t("common.date")}</th><th>{t("common.child")}</th>
          <th>{t("common.status")}</th><th>{t("attendance.arrival")}</th>
          <th>{t("attendance.departure")}</th><th>{t("parent.authorizedPerson")}</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{formatDate(locale, row.date)}</td>
              <td>{row.child.firstName}</td>
              <td><span className="badge">{t(statusKeys[row.status] ?? "common.status")}</span></td>
              <td>{row.arrivalAt ? formatDate(locale, row.arrivalAt, { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td>{row.departureAt ? formatDate(locale, row.departureAt, { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td>{row.pickupPerson || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
