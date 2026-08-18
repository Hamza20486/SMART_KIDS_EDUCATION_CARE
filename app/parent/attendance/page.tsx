import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import type { MessageKey } from "@/lib/i18n";
import { Clock } from "lucide-react";

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
      <div className="pagehead">
        <div>
          <h1>{t("parent.attendanceTitle")}</h1>
          <p className="muted">Historique des présences et des heures de dépose/récupération</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>{t("common.date")}</th>
              <th>{t("common.child")}</th>
              <th>{t("common.status")}</th>
              <th>{t("attendance.arrival")}</th>
              <th>{t("attendance.departure")}</th>
              <th>{t("parent.authorizedPerson")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--muted)" }}>
                  Aucun historique de présence disponible.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td><strong>{formatDate(locale, row.date)}</strong></td>
                  <td>{row.child.firstName}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.status === "PRESENT"
                          ? "badge-success"
                          : row.status === "ABSENT"
                          ? "badge-danger"
                          : row.status === "LATE"
                          ? "badge-warning"
                          : "badge-info"
                      }`}
                    >
                      {t(statusKeys[row.status] ?? "common.status")}
                    </span>
                  </td>
                  <td>
                    {row.arrivalAt ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                        <Clock size={13} color="var(--brand)" />
                        {formatDate(locale, row.arrivalAt, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {row.departureAt ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                        <Clock size={13} color="var(--teal)" />
                        {formatDate(locale, row.departureAt, { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{row.pickupPerson || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
