import { ParentActivityFeed } from "@/components/parent-activity-feed";
import { getTranslations } from "@/lib/i18n/server";

export default async function ParentActivitiesPage() {
  const t = await getTranslations();
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("navigation.activities")}</h1>
          <p className="muted">{t("parent.activitiesSubtitle")}</p>
        </div>
      </div>
      <ParentActivityFeed />
    </>
  );
}
