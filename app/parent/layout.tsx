import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

const navigation: { href: string; labelKey: MessageKey; feature?: FeatureCode }[] = [
  { href: "/parent", labelKey: "navigation.home" },
  { href: "/parent/children", labelKey: "navigation.children" },
  { href: "/parent/attendance", labelKey: "navigation.attendance" },
  { href: "/parent/activities", labelKey: "navigation.activities" },
  { href: "/parent/homework", labelKey: "navigation.homework", feature: "homework" },
  { href: "/parent/absences", labelKey: "navigation.absences" },
  {
    href: "/parent/complaints",
    labelKey: "navigation.complaints",
    feature: "advancedCommunication",
  },
  { href: "/parent/payments", labelKey: "navigation.payments" },
  { href: "/account/notifications", labelKey: "navigation.notifications" },
  { href: "/account/security", labelKey: "navigation.security" },
];

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PARENT") redirect("/admin");
  const access = await getEntitlements(session.user.organizationId).catch(() => null);
  if (!access) redirect("/subscription-inactive");
  const { entitlements } = access;
  const visibleNavigation = navigation.filter(
    (item) => !item.feature || entitlements[item.feature],
  );
  return (
    <div className="parent-shell">
      <header className="shell topbar">
        <Link className="brand" href="/parent">Smart Kids <span>{t("navigation.parents")}</span></Link>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="button secondary">{t("common.logout")}</button>
        </form>
      </header>
      <nav className="parent-nav shell">
        {visibleNavigation.map((item) => (
          <Link key={item.href} href={item.href}>{t(item.labelKey)}</Link>
        ))}
      </nav>
      <main className="shell parent-main">{children}</main>
    </div>
  );
}
