import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/i18n/format";
import {
  Baby,
  Bell,
  CreditCard,
  Sparkles,
  CalendarCheck,
  BookOpen,
  UserX,
  MessageSquare,
  ArrowRight,
  Heart,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await requireUser(["PARENT"]);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
    include: {
      children: {
        include: {
          child: {
            include: {
              class: {
                include: {
                  teachers: {
                    include: { teacher: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const [children, unread, due] = parent
    ? await Promise.all([
        prisma.parentChild.count({
          where: { organizationId: user.organizationId, parentId: parent.id },
        }),
        prisma.notification.count({
          where: { organizationId: user.organizationId, userId: user.id, readAt: null },
        }),
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            parentId: parent.id,
            status: "PENDING",
          },
          _sum: { amountCentimes: true },
        }),
      ])
    : [0, 0, { _sum: { amountCentimes: 0 } }];

  const primaryChild = parent?.children?.[0]?.child;

  return (
    <>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #ff5e3a 0%, #ff8a73 50%, #f59e0b 100%)",
          color: "white",
          padding: "32px 36px",
          borderRadius: 24,
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
          border: 0,
          boxShadow: "0 12px 30px -5px rgba(255, 94, 58, 0.35)",
        }}
      >
        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255, 255, 255, 0.2)",
              padding: "4px 12px",
              borderRadius: "99px",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            <Heart size={14} /> Espace Famille Smart Kids
          </div>
          <h1 style={{ color: "white", fontSize: 28, margin: "0 0 6px" }}>
            {t("parent.greeting", { name: user.name })} 👋
          </h1>
          <p style={{ opacity: 0.9, fontSize: 15, margin: 0, maxWidth: 550 }}>
            {t("parent.subtitle")}
          </p>
        </div>
      </div>

      {/* Primary Child Card Preview */}
      {primaryChild && (
        <div
          className="card"
          style={{
            padding: 24,
            borderRadius: 20,
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            background: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #fbcfe8, #f472b6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 26,
                boxShadow: "0 6px 14px rgba(236, 72, 153, 0.25)",
              }}
            >
              👧
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>
                  {primaryChild.firstName} {primaryChild.lastName}
                </h2>
                <span className="badge badge-purple" style={{ fontSize: 11 }}>
                  ⭐ {primaryChild.class?.name || "Section"}
                </span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Éducatrice :{" "}
                <strong>
                  {primaryChild.class?.teachers?.[0]?.teacher.name || "Nadia Enseignante"}
                </strong>
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/parent/attendance"
              className="button secondary"
              style={{ fontSize: 13, padding: "8px 14px" }}
            >
              <CalendarCheck size={15} color="var(--brand)" /> Présences
            </Link>
            <Link
              href="/parent/activities"
              className="button"
              style={{ fontSize: 13, padding: "8px 14px" }}
            >
              <Sparkles size={15} /> Photos du jour
            </Link>
          </div>
        </div>
      )}

      {/* 3 Stat Cards */}
      <div className="grid" style={{ marginBottom: 32 }}>
        {/* Stat 1: Children */}
        <Link href="/parent/children" className="card stat" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">{t("parent.myChildren")}</span>
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
            <strong>{children}</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Enfant(s) inscrit(s)
            </p>
          </div>
        </Link>

        {/* Stat 2: Unread Notifications */}
        <Link href="/account/notifications" className="card stat" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">{t("notifications.title")}</span>
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
              <Bell size={22} />
            </div>
          </div>
          <div>
            <strong>{unread}</strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              Notification(s) non lue(s)
            </p>
          </div>
        </Link>

        {/* Stat 3: Amount Due */}
        <Link href="/parent/payments" className="card stat" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="muted">{t("parent.amountDue")}</span>
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
            <strong style={{ color: (due._sum.amountCentimes || 0) > 0 ? "#d97706" : "#059669" }}>
              {formatMoney(locale, due._sum.amountCentimes || 0)}
            </strong>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 12.5 }}>
              {(due._sum.amountCentimes || 0) > 0 ? "Solde restant à régler" : "Tout est à jour !"}
            </p>
          </div>
        </Link>
      </div>

      {/* Quick Actions Grid for Parents */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Services & Raccourcis</h2>
      <div className="grid">
        <Link
          href="/parent/activities"
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
            <strong style={{ display: "block", fontSize: 15 }}>Journal d’Activités</strong>
            <span className="muted" style={{ fontSize: 13 }}>Photos et ateliers de la journée</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/parent/homework"
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
              background: "var(--indigo-light)",
              color: "var(--indigo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BookOpen size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Devoirs & Liaisons</strong>
            <span className="muted" style={{ fontSize: 13 }}>Consignes et remises en ligne</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/parent/absences"
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
            <UserX size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Signaler une Absence</strong>
            <span className="muted" style={{ fontSize: 13 }}>Transmettre un justificatif</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/parent/complaints"
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
              background: "var(--teal-light)",
              color: "var(--teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageSquare size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Messagerie & Demandes</strong>
            <span className="muted" style={{ fontSize: 13 }}>Échanges directs avec la direction</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>

        <Link
          href="/parent/payments"
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
            <CreditCard size={24} />
          </div>
          <div style={{ flexGrow: 1 }}>
            <strong style={{ display: "block", fontSize: 15 }}>Factures & Reçus</strong>
            <span className="muted" style={{ fontSize: 13 }}>Historique et justificatifs</span>
          </div>
          <ArrowRight size={18} color="var(--muted)" />
        </Link>
      </div>
    </>
  );
}
