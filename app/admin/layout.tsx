import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { hasPermission, STAFF_ROLES } from "@/lib/permissions";
import type { Permission } from "@/lib/permission-map";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

type NavigationItem = {
  href: string;
  labelKey: MessageKey;
  permissions: Permission[];
  feature?: FeatureCode;
};

const items: NavigationItem[] = [
  { href: "/admin", labelKey: "navigation.dashboard", permissions: ["dashboard.read"] },
  { href: "/admin/enfants", labelKey: "navigation.children", permissions: ["children.read"] },
  { href: "/admin/parents", labelKey: "navigation.parents", permissions: ["parents.read"] },
  { href: "/admin/classes", labelKey: "navigation.classes", permissions: ["classes.read"] },
  { href: "/admin/attendance", labelKey: "navigation.attendanceHistory", permissions: ["attendance.read"] },
  { href: "/admin/attendance/daily", labelKey: "navigation.dailyAttendance", permissions: ["attendance.read"] },
  { href: "/admin/attendance/corrections", labelKey: "navigation.corrections", permissions: ["attendance.correct"] },
  { href: "/admin/arrival-departure", labelKey: "navigation.arrivalDeparture", permissions: ["attendance.read"] },
  { href: "/admin/activities", labelKey: "navigation.activities", permissions: ["activities.read"] },
  { href: "/admin/homework", labelKey: "navigation.homework", permissions: ["homework.read"], feature: "homework" },
  { href: "/admin/absences", labelKey: "navigation.absences", permissions: ["absences.read"] },
  { href: "/admin/complaints", labelKey: "navigation.complaints", permissions: ["complaints.read"], feature: "advancedCommunication" },
  { href: "/admin/payments", labelKey: "navigation.payments", permissions: ["payments.read"] },
  { href: "/admin/staff", labelKey: "navigation.staff", permissions: ["staff.read"] },
  { href: "/admin/announcements", labelKey: "navigation.announcements", permissions: ["announcements.read"] },
  { href: "/account/notifications", labelKey: "navigation.notifications", permissions: ["dashboard.read"] },
  { href: "/admin/notifications/deliveries", labelKey: "navigation.notificationDelivery", permissions: ["settings.manage"] },
  { href: "/admin/attendance/reports", labelKey: "reports.operationalTitle", permissions: ["reports.operational"] },
  { href: "/admin/payments/reports", labelKey: "reports.financialTitle", permissions: ["reports.financial"] },
  { href: "/admin/settings", labelKey: "navigation.settings", permissions: ["settings.manage"] },
  { href: "/account/security", labelKey: "navigation.security", permissions: ["dashboard.read"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/super-admin");
  if (!STAFF_ROLES.includes(session.user.role)) redirect("/parent");
  const access = await getEntitlements(session.user.organizationId).catch(() => null);
  if (!access) redirect("/subscription-inactive");
  const { entitlements } = access;
  const visibleItems = items.filter(
    (item) =>
      item.permissions.some((permission) => hasPermission(session.user.role, permission)) &&
      (!item.feature || entitlements[item.feature]),
  );
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand" style={{ color: "white", marginBottom: 20 }}>Smart Kids</div>
        <nav>{visibleItems.map((item) => <Link key={item.href} href={item.href}>{t(item.labelKey)}</Link>)}</nav>
        <p style={{ marginTop: 20, fontSize: 13 }}>
          {session.user.name}<br /><span style={{ opacity: 0.7 }}>{session.user.role}</span>
        </p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="button">{t("common.logout")}</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
