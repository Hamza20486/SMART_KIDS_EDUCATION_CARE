import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { hasPermission, STAFF_ROLES } from "@/lib/permissions";
import type { Permission } from "@/lib/permission-map";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";
import {
  LayoutDashboard,
  Baby,
  Users,
  GraduationCap,
  CalendarCheck,
  ClipboardCheck,
  FileCheck,
  Clock,
  Sparkles,
  BookOpen,
  UserX,
  MessageSquare,
  CreditCard,
  UserCheck,
  Megaphone,
  Bell,
  Send,
  BarChart3,
  TrendingUp,
  Settings,
  ShieldCheck,
  LogOut,
} from "lucide-react";

type NavigationItem = {
  href: string;
  labelKey: MessageKey;
  permissions: Permission[];
  feature?: FeatureCode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string; color?: string }>;
};

const items: NavigationItem[] = [
  { href: "/admin", labelKey: "navigation.dashboard", permissions: ["dashboard.read"], icon: LayoutDashboard },
  { href: "/admin/enfants", labelKey: "navigation.children", permissions: ["children.read"], icon: Baby },
  { href: "/admin/parents", labelKey: "navigation.parents", permissions: ["parents.read"], icon: Users },
  { href: "/admin/classes", labelKey: "navigation.classes", permissions: ["classes.read"], icon: GraduationCap },
  { href: "/admin/attendance/daily", labelKey: "navigation.dailyAttendance", permissions: ["attendance.read"], icon: ClipboardCheck },
  { href: "/admin/attendance", labelKey: "navigation.attendanceHistory", permissions: ["attendance.read"], icon: CalendarCheck },
  { href: "/admin/attendance/corrections", labelKey: "navigation.corrections", permissions: ["attendance.correct"], icon: FileCheck },
  { href: "/admin/arrival-departure", labelKey: "navigation.arrivalDeparture", permissions: ["attendance.read"], icon: Clock },
  { href: "/admin/activities", labelKey: "navigation.activities", permissions: ["activities.read"], icon: Sparkles },
  { href: "/admin/homework", labelKey: "navigation.homework", permissions: ["homework.read"], feature: "homework", icon: BookOpen },
  { href: "/admin/absences", labelKey: "navigation.absences", permissions: ["absences.read"], icon: UserX },
  { href: "/admin/complaints", labelKey: "navigation.complaints", permissions: ["complaints.read"], feature: "advancedCommunication", icon: MessageSquare },
  { href: "/admin/payments", labelKey: "navigation.payments", permissions: ["payments.read"], icon: CreditCard },
  { href: "/admin/staff", labelKey: "navigation.staff", permissions: ["staff.read"], icon: UserCheck },
  { href: "/admin/announcements", labelKey: "navigation.announcements", permissions: ["announcements.read"], icon: Megaphone },
  { href: "/account/notifications", labelKey: "navigation.notifications", permissions: ["dashboard.read"], icon: Bell },
  { href: "/admin/notifications/deliveries", labelKey: "navigation.notificationDelivery", permissions: ["settings.manage"], icon: Send },
  { href: "/admin/attendance/reports", labelKey: "reports.operationalTitle", permissions: ["reports.operational"], icon: BarChart3 },
  { href: "/admin/payments/reports", labelKey: "reports.financialTitle", permissions: ["reports.financial"], icon: TrendingUp },
  { href: "/admin/settings", labelKey: "navigation.settings", permissions: ["settings.manage"], icon: Settings },
  { href: "/account/security", labelKey: "navigation.security", permissions: ["dashboard.read"], icon: ShieldCheck },
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

  const initials = (session.user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          {/* Logo & School Name */}
          <div className="sidebar-header">
            <Link
              href="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                color: "white",
                textDecoration: "none",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ff5e3a, #f59e0b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  boxShadow: "0 6px 16px rgba(255, 94, 58, 0.4)",
                  flexShrink: 0,
                }}
              >
                <GraduationCap size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>Smart Kids</div>
                <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Administration & Équipe</div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Icon size={17} style={{ opacity: 0.85, flexShrink: 0 }} />
                  <span style={{ flexGrow: 1 }}>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div style={{ overflow: "hidden" }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13.5,
                  color: "white",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                }}
              >
                {session.user.name}
              </div>
              <div
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "99px",
                  background: "rgba(255, 94, 58, 0.2)",
                  color: "#ff8a73",
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 2,
                }}
              >
                {session.user.role}
              </div>
            </div>
          </div>

          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="button secondary"
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#e2e8f0 !important",
                borderColor: "rgba(255, 255, 255, 0.15)",
                fontSize: 13,
                padding: "8px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <LogOut size={15} /> {t("common.logout")}
            </button>
          </form>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
