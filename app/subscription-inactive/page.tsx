import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getTranslations } from "@/lib/i18n/server";

export default async function SubscriptionInactivePage() {
  const session = await auth();
  const t = await getTranslations();
  if (!session?.user) redirect("/login");
  if (session.user.role === "SUPER_ADMIN") redirect("/super-admin");
  return (
    <main className="login">
      <section className="card">
        <h1>{t("subscriptions.inactiveTitle")}</h1>
        <p>{t("subscriptions.inactiveText")}</p>
        <p className="muted">{t("subscriptions.inactiveHelp")}</p>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="button">{t("common.logout")}</button>
        </form>
      </section>
    </main>
  );
}
