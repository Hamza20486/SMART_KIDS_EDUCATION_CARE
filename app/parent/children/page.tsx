import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaConsentButton } from "@/components/media-consent";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatDate } from "@/lib/i18n/format";
import { UserCheck, Camera } from "lucide-react";

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
      <div className="pagehead">
        <div>
          <h1>{t("parent.myChildren")}</h1>
          <p className="muted">Profils, autorisations et consentement média de vos enfants</p>
        </div>
      </div>

      <div className="grid">
        {children.map((child) => (
          <article
            className="card"
            key={child.id}
            style={{
              padding: 24,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fbcfe8, #f472b6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                👧
              </div>
              <div>
                <h2 style={{ fontSize: 18, margin: "0 0 2px" }}>
                  {child.firstName} {child.lastName}
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {t("parent.bornOn", { date: formatDate(locale, child.birthDate) })}
                </p>
              </div>
            </div>

            <div>
              <span className="badge badge-purple" style={{ fontSize: 12 }}>
                ⭐ {child.class?.name || t("parent.noClass")}
              </span>
            </div>

            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: 14, border: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <UserCheck size={16} color="var(--brand)" /> {t("parent.authorizedPeople")}
              </h3>
              {child.pickupAuthorizations.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {child.pickupAuthorizations.map((person) => (
                    <div key={person.id} style={{ fontSize: 13, color: "var(--ink)" }}>
                      • <strong>{person.name}</strong> ({person.relationship})
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                  {t("parent.noAuthorizedPeople")}
                </p>
              )}
            </div>

            <div style={{ background: "var(--paper)", padding: "14px 16px", borderRadius: 14, border: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Camera size={16} color="var(--purple)" /> {t("parent.mediaConsent")}
              </h3>
              <MediaConsentButton
                childId={child.id}
                granted={child.mediaConsents.some((consent) => consent.status === "GRANTED")}
              />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
