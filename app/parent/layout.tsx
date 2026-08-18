import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getEntitlements } from "@/lib/subscriptions/service";
import type { FeatureCode } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";
import {
  Home,
  Baby,
  CalendarCheck,
  Sparkles,
  BookOpen,
  UserX,
  MessageSquare,
  CreditCard,
  Bell,
  ShieldCheck,
  LogOut,
  Heart,
} from "lucide-react";

type NavItem = {
  href: string;
  labelKey: MessageKey;
  feature?: FeatureCode;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const navigation: NavItem[] = [
  { href: "/parent", labelKey: "navigation.home", icon: Home },
  { href: "/parent/children", labelKey: "navigation.children", icon: Baby },
  { href: "/parent/attendance", labelKey: "navigation.attendance", icon: CalendarCheck },
  { href: "/parent/activities", labelKey: "navigation.activities", icon: Sparkles },
  { href: "/parent/homework", labelKey: "navigation.homework", feature: "homework", icon: BookOpen },
  { href: "/parent/absences", labelKey: "navigation.absences", icon: UserX },
  {
    href: "/parent/complaints",
    labelKey: "navigation.complaints",
    feature: "advancedCommunication",
    icon: MessageSquare,
  },
  { href: "/parent/payments", labelKey: "navigation.payments", icon: CreditCard },
  { href: "/account/notifications", labelKey: "navigation.notifications", icon: Bell },
  { href: "/account/security", labelKey: "navigation.security", icon: ShieldCheck },
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

  const initials = (session.user.name || "P")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="parent-shell">
      {/* Top Header */}
      <header
        style={{
          background: "white",
          borderBottom: "1px solid var(--line)",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
        }}
      >
        <div className="shell topbar" style={{ padding: "14px 24px" }}>
          <Link href="/parent" className="brand" style={{ fontSize: 20 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ff5e3a, #ff8a73)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                boxShadow: "0 4px 12px rgba(255, 94, 58, 0.3)",
              }}
            >
              <Heart size={20} />
            </div>
            <div>
              Smart Kids <span style={{ color: "var(--brand)" }}>{t("navigation.parents")}</span>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--brand-light)",
                  color: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {initials}
              </div>
              <div className="hidden sm:block" style={{ fontSize: 13.5 }}>
                <div style={{ fontWeight: 700, color: "var(--ink)" }}>{session.user.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Espace Famille</div>
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
                  padding: "8px 14px",
                  fontSize: 13,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <LogOut size={14} /> {t("common.logout")}
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Horizontal Nav Bar */}
      <div style={{ background: "white", borderBottom: "1px solid var(--line)" }}>
        <nav className="parent-nav shell">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon size={15} />
                <span>{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <main className="shell parent-main">{children}</main>
    </div>
  );
}
