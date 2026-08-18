import { getAuthContext } from "@/lib/auth-context";
import { childrenRepository } from "@/lib/repositories/children";
import { ParentAbsenceManager } from "@/components/parent-absence-manager";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ParentAbsencesPage() {
  const [context, t] = await Promise.all([getAuthContext(), getTranslations()]);
  const children = await childrenRepository.list(context);
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("parent.absencesTitle")}</h1>
          <p className="muted">{t("parent.absencesSubtitle")}</p>
        </div>
      </div>
      <ParentAbsenceManager
        childrenList={children.map((child) => ({
          id: child.id,
          name: `${child.firstName} ${child.lastName}`,
        }))}
      />
    </>
  );
}
