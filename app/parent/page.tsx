import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getTranslations } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/i18n/format";

export const dynamic = "force-dynamic";

export default async function ParentDashboard() {
  const user = await requireUser(["PARENT"]);
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const parent = await prisma.parent.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
  });
  const [children, unread, due] = parent
    ? await Promise.all([
        prisma.parentChild.count({
          where: { organizationId: user.organizationId, parentId: parent.id },
        }),
        prisma.notification.count({
          where: { organizationId: user.organizationId, userId: user.id, readAt: null },
        }),
        prisma.payment.aggregate({
          where: {
            organizationId: user.organizationId,
            parentId: parent.id,
            status: "PENDING",
          },
          _sum: { amountCentimes: true },
        }),
      ])
    : [0, 0, { _sum: { amountCentimes: 0 } }];
  return (
    <>
      <h1>{t("parent.greeting", { name: user.name })}</h1>
      <p className="muted">{t("parent.subtitle")}</p>
      <div className="grid">
        <div className="card stat"><span>{t("parent.myChildren")}</span><strong>{children}</strong></div>
        <div className="card stat"><span>{t("notifications.title")}</span><strong>{unread}</strong></div>
        <div className="card stat">
          <span>{t("parent.amountDue")}</span>
          <strong>{formatMoney(locale, due._sum.amountCentimes || 0)}</strong>
        </div>
      </div>
    </>
  );
}
