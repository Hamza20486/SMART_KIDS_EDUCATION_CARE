import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaConsentButton } from "@/components/media-consent";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const user = await requireUser(["PARENT"]);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
  });
  const children = parent
    ? await prisma.child.findMany({
        where: {
          organizationId: user.organizationId,
          parents: { some: { parentId: parent.id } },
        },
        include: {
          class: true,
          pickupAuthorizations: { where: { active: true } },
          mediaConsents: {
            where: { parentId: parent.id, scope: "ACTIVITY_MEDIA" },
          },
        },
      })
    : [];
  return (
    <>
      <h1>{t("parent.myChildren")}</h1>
      <div className="grid">
        {children.map((child) => (
          <article className="card" key={child.id}>
            <h2>{child.firstName} {child.lastName}</h2>
            <p className="muted">
              {t("parent.bornOn", { date: formatDate(locale, child.birthDate) })}
            </p>
            <span className="badge">{child.class?.name || t("parent.noClass")}</span>
            <h3>{t("parent.authorizedPeople")}</h3>
            {child.pickupAuthorizations.length ? (
              child.pickupAuthorizations.map((person) => (
                <p key={person.id}>{person.name} — {person.relationship}</p>
              ))
            ) : (
              <p className="muted">{t("parent.noAuthorizedPeople")}</p>
            )}
            <h3>{t("parent.mediaConsent")}</h3>
            <MediaConsentButton
              childId={child.id}
              granted={child.mediaConsents.some((consent) => consent.status === "GRANTED")}
            />
          </article>
        ))}
      </div>
    </>
  );
}
