import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import Link from "next/link";
import { getTranslations } from "@/lib/i18n/server";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/admin");
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand" style={{ color: "white" }}>Smart Kids SaaS</div>
        <nav>
          <Link href="/super-admin">{t("navigation.organizations")}</Link>
          <Link href="/super-admin/reports">{t("navigation.reports")}</Link>
        </nav>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="button">{t("common.logout")}</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
