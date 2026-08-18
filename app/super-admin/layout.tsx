import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";
import { Building2, BarChart3, LogOut, Shield } from "lucide-react";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin");

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Shield size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "white" }}>Smart Kids SaaS</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Plateforme Multi-Tenant</div>
              </div>
            </div>
          </div>
          <nav>
            <Link href="/super-admin" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Building2 size={17} /> {t("navigation.organizations")}
            </Link>
            <Link href="/super-admin/reports" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <BarChart3 size={17} /> {t("navigation.reports")}
            </Link>
          </nav>
        </div>

        <div className="sidebar-footer">
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
