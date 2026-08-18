import { requirePermission } from "@/lib/permissions";
import { subscriptionsRepository } from "@/lib/repositories/subscriptions";
import { CreateForm } from "@/components/create-form";
import { SubscriptionManager } from "@/components/subscription-manager";
import { parsePlanEntitlements } from "@/lib/subscriptions/plans";
import { getTranslations } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  await requirePermission("platform.manage");
  const t = await getTranslations();
  const { organizations, plans } = await subscriptionsRepository.platformOverview();
  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{t("subscriptions.title")}</h1>
          <p className="muted">{t("subscriptions.subtitle")}</p>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 24 }}>
        {plans.map((plan) => {
          const entitlements = parsePlanEntitlements(plan.code, plan.features);
          return (
            <div className="card stat" key={plan.id}>
              <span>{plan.name}</span>
              <strong>{(plan.priceCentimes / 100).toFixed(0)} DH</strong>
              <span className="muted">
                {entitlements.maxChildren} enfants · {entitlements.maxStaff} employés ·{" "}
                {entitlements.storageMb} Mo
              </span>
            </div>
          );
        })}
      </div>

      <CreateForm
        endpoint="/api/platform/organizations"
        title={t("subscriptions.newOrganization")}
        fields={[
          { name: "name", label: t("subscriptions.organization"), required: true },
          { name: "slug", label: t("subscriptions.identifier"), required: true },
          { name: "city", label: t("subscriptions.city"), required: true },
          { name: "adminName", label: t("subscriptions.adminName"), required: true },
          {
            name: "adminEmail",
            label: t("subscriptions.adminEmail"),
            type: "email",
            required: true,
          },
          {
            name: "adminPassword",
            label: t("subscriptions.initialPassword"),
            type: "password",
            required: true,
          },
          {
            name: "planCode",
            label: t("subscriptions.plan"),
            options: plans.map((plan) => ({
              value: plan.code,
              label: `${plan.name} — ${(plan.priceCentimes / 100).toFixed(0)} DH`,
            })),
            required: true,
          },
        ]}
      />

      <div style={{ height: 28 }} />
      <SubscriptionManager
        plans={plans.map((plan) => ({
          code: plan.code,
          name: plan.name,
          priceCentimes: plan.priceCentimes,
        }))}
        organizations={organizations.map((organization) => ({
          id: organization.id,
          name: organization.name,
          city: organization.city,
          active: organization.active,
          subscription: organization.subscription
            ? {
                id: organization.subscription.id,
                status: organization.subscription.status,
                trialEndsAt: organization.subscription.trialEndsAt?.toISOString() ?? null,
                currentPeriodEnd: organization.subscription.currentPeriodEnd.toISOString(),
                plan: {
                  code: organization.subscription.plan.code,
                  name: organization.subscription.plan.name,
                  priceCentimes: organization.subscription.plan.priceCentimes,
                },
                events: organization.subscription.events.map((event) => ({
                  id: event.id,
                  action: event.action,
                  fromPlanCode: event.fromPlanCode,
                  toPlanCode: event.toPlanCode,
                  fromStatus: event.fromStatus,
                  toStatus: event.toStatus,
                  createdAt: event.createdAt.toISOString(),
                })),
              }
            : null,
          usage: organization.usage,
        }))}
      />
    </>
  );
}
