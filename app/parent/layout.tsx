import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";
import { Heart, LogOut } from "lucide-react";
import { MobileNavigation, NavigationLinks, type AppNavItem } from "@/components/app-navigation";

type NavItem = { href: string; labelKey: MessageKey; feature?: FeatureCode; icon: AppNavItem["icon"] };
const navigation: NavItem[] = [
  { href: "/parent", labelKey: "navigation.home", icon: "Home" },
  { href: "/parent/children", labelKey: "navigation.children", icon: "Baby" },
  { href: "/parent/attendance", labelKey: "navigation.attendance", icon: "CalendarCheck" },
  { href: "/parent/activities", labelKey: "navigation.activities", icon: "Sparkles" },
  { href: "/parent/homework", labelKey: "navigation.homework", feature: "homework", icon: "BookOpen" },
  { href: "/parent/absences", labelKey: "navigation.absences", icon: "UserX" },
  { href: "/parent/complaints", labelKey: "navigation.complaints", feature: "advancedCommunication", icon: "MessageSquare" },
  { href: "/parent/payments", labelKey: "navigation.payments", icon: "CreditCard" },
  { href: "/account/notifications", labelKey: "navigation.notifications", icon: "Bell" },
  { href: "/account/security", labelKey: "navigation.security", icon: "ShieldCheck" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PARENT") redirect("/admin");
  const access = await getEntitlements(session.user.organizationId).catch(() => null);
  if (!access) redirect("/subscription-inactive");
  const visibleItems: AppNavItem[] = navigation.filter((item) => !item.feature || access.entitlements[item.feature]).map((item) => ({ href: item.href, label: t(item.labelKey), icon: item.icon }));
  const initials = (session.user.name || "P").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const logoutAction = async () => { "use server"; await signOut({ redirectTo: "/login" }); };

  return (
    <div className="dashboard parent-shell">
      <aside className="sidebar desktop-sidebar parent-sidebar">
        <div className="sidebar-main">
          <Link href="/parent" className="sidebar-brand">
            <span className="brand-mark"><Heart size={21} fill="currentColor" /></span>
            <span><strong>Smart Kids</strong><small>Espace Famille</small></span>
          </Link>
          <div className="nav-section-label">Mon espace</div>
          <NavigationLinks items={visibleItems} />
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user"><div className="user-avatar">{initials}</div><div className="user-meta"><strong>{session.user.name}</strong><span>Compte parent</span></div></div>
          <form action={logoutAction}><button type="submit" className="sidebar-logout"><LogOut size={16} /> {t("common.logout")}</button></form>
        </div>
      </aside>
      <MobileNavigation items={visibleItems} name={session.user.name || "Parent"} initials={initials} areaLabel="Espace Famille" logoutLabel={t("common.logout")} logoutAction={logoutAction} />
      <main className="main parent-main">{children}</main>
    </div>
  );
}
