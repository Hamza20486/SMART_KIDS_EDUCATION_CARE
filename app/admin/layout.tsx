import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { hasPermission, STAFF_ROLES } from "@/lib/permissions";
import type { Permission } from "@/lib/permission-map";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";
import { GraduationCap, LogOut } from "lucide-react";
import { MobileNavigation, NavigationLinks, type AppNavItem } from "@/components/app-navigation";

type NavigationItem = {
  href: string;
  labelKey: MessageKey;
  permissions: Permission[];
  feature?: FeatureCode;
  icon: AppNavItem["icon"];
};

const items: NavigationItem[] = [
  { href: "/admin", labelKey: "navigation.dashboard", permissions: ["dashboard.read"], icon: "LayoutDashboard" },
  { href: "/admin/enfants", labelKey: "navigation.children", permissions: ["children.read"], icon: "Baby" },
  { href: "/admin/parents", labelKey: "navigation.parents", permissions: ["parents.read"], icon: "Users" },
  { href: "/admin/classes", labelKey: "navigation.classes", permissions: ["classes.read"], icon: "GraduationCap" },
  { href: "/admin/attendance/daily", labelKey: "navigation.dailyAttendance", permissions: ["attendance.read"], icon: "ClipboardCheck" },
  { href: "/admin/attendance", labelKey: "navigation.attendanceHistory", permissions: ["attendance.read"], icon: "CalendarCheck" },
  { href: "/admin/attendance/corrections", labelKey: "navigation.corrections", permissions: ["attendance.correct"], icon: "FileCheck" },
  { href: "/admin/arrival-departure", labelKey: "navigation.arrivalDeparture", permissions: ["attendance.read"], icon: "Clock" },
  { href: "/admin/activities", labelKey: "navigation.activities", permissions: ["activities.read"], icon: "Sparkles" },
  { href: "/admin/homework", labelKey: "navigation.homework", permissions: ["homework.read"], feature: "homework", icon: "BookOpen" },
  { href: "/admin/absences", labelKey: "navigation.absences", permissions: ["absences.read"], icon: "UserX" },
  { href: "/admin/complaints", labelKey: "navigation.complaints", permissions: ["complaints.read"], feature: "advancedCommunication", icon: "MessageSquare" },
  { href: "/admin/payments", labelKey: "navigation.payments", permissions: ["payments.read"], icon: "CreditCard" },
  { href: "/admin/staff", labelKey: "navigation.staff", permissions: ["staff.read"], icon: "UserCheck" },
  { href: "/admin/announcements", labelKey: "navigation.announcements", permissions: ["announcements.read"], icon: "Megaphone" },
  { href: "/account/notifications", labelKey: "navigation.notifications", permissions: ["dashboard.read"], icon: "Bell" },
  { href: "/admin/notifications/deliveries", labelKey: "navigation.notificationDelivery", permissions: ["settings.manage"], icon: "Send" },
  { href: "/admin/attendance/reports", labelKey: "reports.operationalTitle", permissions: ["reports.operational"], icon: "BarChart3" },
  { href: "/admin/payments/reports", labelKey: "reports.financialTitle", permissions: ["reports.financial"], icon: "TrendingUp" },
  { href: "/admin/settings", labelKey: "navigation.settings", permissions: ["settings.manage"], icon: "Settings" },
  { href: "/account/security", labelKey: "navigation.security", permissions: ["dashboard.read"], icon: "ShieldCheck" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/super-admin");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/parent");
  const access = await getEntitlements(session.user.organizationId).catch(() => null);
  if (!access) redirect("/subscription-inactive");

  const visibleItems: AppNavItem[] = items
    .filter((item) => item.permissions.some((permission) => hasPermission(session.user.role, permission)) && (!item.feature || access.entitlements[item.feature]))
    .map((item) => ({ href: item.href, label: t(item.labelKey), icon: item.icon }));
  const initials = (session.user.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const logoutAction = async () => { "use server"; await signOut({ redirectTo: "/login" }); };

  return (
    <div className="dashboard">
      <aside className="sidebar desktop-sidebar">
        <div className="sidebar-main">
          <Link href="/admin" className="sidebar-brand">
            <span className="brand-mark"><GraduationCap size={23} /></span>
            <span><strong>Smart Kids</strong><small>Education Care</small></span>
          </Link>
          <div className="nav-section-label">Espace de gestion</div>
          <NavigationLinks items={visibleItems} />
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-meta"><strong>{session.user.name}</strong><span>{session.user.role}</span></div>
          </div>
          <form action={logoutAction}><button type="submit" className="sidebar-logout"><LogOut size={16} /> {t("common.logout")}</button></form>
        </div>
      </aside>
      <MobileNavigation items={visibleItems} name={session.user.name || "Utilisateur"} initials={initials} areaLabel="Administration" logoutLabel={t("common.logout")} logoutAction={logoutAction} />
      <main className="main">{children}</main>
    </div>
  );
}
