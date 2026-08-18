import Link from "next/link";
import { requirePermission, authorizedClassIds, hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/i18n/server";
import {
  Baby,
  Users,
  CalendarCheck,
  CreditCard,
  PlusCircle,
  ClipboardCheck,
  Sparkles,
  Megaphone,
  ArrowRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const t = await getTranslations();
  const u = await requirePermission("dashboard.read");
  const ids = await authorizedClassIds(u);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [c, p, a, due, classesCount] = await Promise.all([
    prisma.child.count({
      where: {
        organizationId: u.organizationId,
        active: true,
        ...(ids ? { classId: { in: ids } } : {}),
      },
    }),
    hasPermission(u.role, "parents.read")
      ? prisma.parent.count({ where: { organizationId: u.organizationId } })
      : 0,
    prisma.attendance.count({
      where: {
        organizationId: u.organizationId,
        date: { gte: start },
        ...(ids ? { child: { classId: { in: ids } } } : {}),
      },
    }),
    hasPermission(u.role, "payments.read")
      ? prisma.payment.aggregate({
          where: { organizationId: u.organizationId, status: "PENDING" },
          _sum: { amountCentimes: true },
        })
      : null,
    prisma.classRoom.count({
      where: { organizationId: u.organizationId, active: true },
    }),
  ]);

  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      {/* Welcome Header */}
      <div className="pagehead">
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--brand)", textTransform: "capitalize", marginBottom: 4 }}>
            📅 {todayFormatted}
          </div>
          <h1>{t("navigation.dashboard")}</h1>
          <p className="muted">{t("staff.dashboardSubtitle")}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/admin/attendance/daily"
            className="button"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <ClipboardCheck size={16} /> Faire l’appel du jour
          </Link>
          <Link
            href="/admin/enfants"
            className="button secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <PlusCircle size={16} /> Inscrire un enfant
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid" style={{ marginBottom: 32 }}>
        {/* Stat 1: Children */}
        <div className="card stat">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">{t("staff.authorizedChildren")}</span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--brand-light)",
                color: "var(--brand)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Baby size={22} />
            </div>
          </div>
          <div>
            <strong>{c}</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Répartis dans {classesCount} classe(s)
            </p>
          </div>
        </div>

        {/* Stat 2: Parents */}
        {hasPermission(u.role, "parents.read") && (
          <div className="card stat">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="muted">{t("navigation.parents")}</span>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--teal-light)",
                  color: "var(--teal)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={22} />
              </div>
            </div>
            <div>
              <strong>{p}</strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                Comptes familles enregistrés
              </p>
            </div>
          </div>
        )}

        {/* Stat 3: Today's Attendance */}
        <div className="card stat">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">{t("staff.todayAttendance")}</span>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "var(--indigo-light)",
                color: "var(--indigo)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CalendarCheck size={22} />
            </div>
          </div>
          <div>
            <strong>{a}</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Présents enregistrés aujourd’hui
            </p>
          </div>
        </div>

        {/* Stat 4: Pending Payments */}
        {due && (
          <div className="card stat">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="muted">{t("staff.unpaid")}</span>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--brand2-light)",
                  color: "var(--brand2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CreditCard size={22} />
              </div>
            </div>
            <div>
              <strong style={{ color: "#d97706" }}>
                {((due._sum.amountCentimes || 0) / 100).toFixed(2)} DH
              </strong>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
                En attente d’encaissement
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Shortcuts Grid */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Accès Rapides & Actions Fréquentes</h2>
      <div className="grid" style={{ marginBottom: 32 }}>
        <Link
          href="/admin/attendance/daily"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--brand-light)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClipboardCheck size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Appel Quotidien</strong>
            <span className="muted" style={{ fontSize: 13 }}>Pointage en direct de la classe</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/admin/activities"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--purple-light)",
              color: "var(--purple)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Sparkles size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Activités & Photos</strong>
            <span className="muted" style={{ fontSize: 13 }}>Publier pour les parents</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/admin/announcements"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "var(--brand2-light)",
              color: "var(--brand2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Megaphone size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Communication</strong>
            <span className="muted" style={{ fontSize: 13 }}>Annonces et circulaires</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>
      </div>
    </>
  );
}
