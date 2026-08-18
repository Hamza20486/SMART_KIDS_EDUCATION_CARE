import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SecurityForm, ProfileForm } from "@/components/account-forms";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const user = await requireUser();
  const t = await getTranslations();
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { phone: true },
  });
  return (
    <main className="shell" style={{ paddingTop: 40 }}>
      <h1>{t("auth.accountSecurity")}</h1>
      <p className="muted">{user.email}</p>
      <ProfileForm name={user.name} phone={profile.phone} />
      <div style={{ height: 20 }} />
      <SecurityForm />
    </main>
  );
}
