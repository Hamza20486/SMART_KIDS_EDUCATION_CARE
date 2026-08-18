import{requirePermission}from"@/lib/permissions";import{prisma}from"@/lib/prisma";import{SettingsForm}from"@/components/settings-form";
import{getTranslations}from"@/lib/i18n/server";
export const dynamic="force-dynamic";export default async function Page(){const t=await getTranslations();const u=await requirePermission("settings.manage");const o=await prisma.organization.findUniqueOrThrow({where:{id:u.organizationId}});return <><div className="pagehead"><div><h1>{t("navigation.settings")}</h1><p className="muted">{t("staff.settingsSubtitle")}</p></div></div><SettingsForm initial={o}/></>}
