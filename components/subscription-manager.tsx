"use client";
import { clientTranslate } from "@/lib/i18n/client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { formatDateTime } from "@/lib/i18n/format";

type Plan = {
  code: string;
  name: string;
  priceCentimes: number;
};

type OrganizationRow = {
  id: string;
  name: string;
  city: string;
  active: boolean;
  subscription: null | {
    id: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string;
    plan: Plan;
    events: {
      id: string;
      action: string;
      fromPlanCode: string | null;
      toPlanCode: string | null;
      fromStatus: string | null;
      toStatus: string | null;
      createdAt: string;
    }[];
  };
  usage: null | {
    children: number;
    staff: number;
    storageBytes: number;
    limits: { children: number; staff: number; storageBytes: number };
  };
};

function percent(value: number, maximum: number) {
  if (!maximum) return 0;
  return Math.min(100, Math.round((value / maximum) * 100));
}

export function SubscriptionManager({
  organizations,
  plans,
}: {
  organizations: OrganizationRow[];
  plans: Plan[];
}) {
  const router = useRouter();
  const { t, locale } = useI18n();

  async function update(
    event: React.FormEvent<HTMLFormElement>,
    organizationId: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/platform/subscriptions", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId,
        action: form.get("action"),
        planCode: form.get("planCode"),
        periodMonths: form.get("periodMonths"),
        trialDays: form.get("trialDays"),
        reason: form.get("reason") || undefined,
      }),
    });
    if (!response.ok) {
      toast.error(clientTranslate("common.retry"));
      return;
    }
    toast.success(clientTranslate("common.save"));
    router.refresh();
  }

  return (
    <div>
      {organizations.map((organization) => {
        const subscription = organization.subscription;
        const usage = organization.usage;
        return (
          <article className="card" key={organization.id} style={{ marginBottom: 20 }}>
            <div className="pagehead">
              <div>
                <h2>{organization.name}</h2>
                <p className="muted">
                  {organization.city} — {subscription?.plan.name ?? "Sans plan"} —{" "}
                  {subscription?.status ?? "NON CONFIGURÉ"}
                </p>
                {subscription && (
                  <p className="muted">
                    {t("subscriptions.periodEnd", {
                      date: formatDateTime(locale, subscription.currentPeriodEnd),
                    })}
                    {subscription.trialEndsAt
                      ? ` — ${t("subscriptions.trialEnd", {
                          date: formatDateTime(locale, subscription.trialEndsAt),
                        })}`
                      : ""}
                  </p>
                )}
              </div>
            </div>

            {usage && (
              <div className="grid" style={{ marginBottom: 20 }}>
                <div>
                  <strong>{t("subscriptions.usageChildren")}</strong>
                  <p>{usage.children}/{usage.limits.children} ({percent(usage.children, usage.limits.children)}%)</p>
                </div>
                <div>
                  <strong>{t("subscriptions.usageStaff")}</strong>
                  <p>{usage.staff}/{usage.limits.staff} ({percent(usage.staff, usage.limits.staff)}%)</p>
                </div>
                <div>
                  <strong>{t("subscriptions.storage")}</strong>
                  <p>
                    {(usage.storageBytes / 1_048_576).toFixed(1)} /{" "}
                    {(usage.limits.storageBytes / 1_048_576).toFixed(0)} Mo
                  </p>
                </div>
              </div>
            )}

            {subscription?.events.length ? (
              <details style={{ marginBottom: 20 }}>
                <summary>{t("subscriptions.history")}</summary>
                {subscription.events.map((item) => (
                  <p className="muted" key={item.id}>
                    {formatDateTime(locale, item.createdAt)} — {item.action}
                    {item.fromPlanCode || item.toPlanCode
                      ? ` — ${item.fromPlanCode ?? "—"} → ${item.toPlanCode ?? "—"}`
                      : ""}
                    {item.fromStatus || item.toStatus
                      ? ` — ${item.fromStatus ?? "—"} → ${item.toStatus ?? "—"}`
                      : ""}
                  </p>
                ))}
              </details>
            ) : null}

            <form className="form" onSubmit={(event) => update(event, organization.id)}>
              <label>
                {t("common.action")}
                <select name="action" defaultValue="RENEW">
                  <option value="START_TRIAL">{t("subscriptions.startTrial")}</option>
                  <option value="ACTIVATE">{t("subscriptions.activate")}</option>
                  <option value="RENEW">{t("subscriptions.renew")}</option>
                  <option value="CHANGE_PLAN">{t("subscriptions.changePlan")}</option>
                  <option value="MARK_PAST_DUE">{t("subscriptions.pastDue")}</option>
                  <option value="SUSPEND">{t("subscriptions.suspend")}</option>
                  <option value="CANCEL">{t("subscriptions.cancel")}</option>
                </select>
              </label>
              <label>
                {t("subscriptions.plan")}
                <select name="planCode" defaultValue={subscription?.plan.code ?? plans[0]?.code}>
                  {plans.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name} — {(plan.priceCentimes / 100).toFixed(0)} DH
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("subscriptions.months")}
                <input name="periodMonths" type="number" min={1} max={24} defaultValue={1} />
              </label>
              <label>
                {t("subscriptions.trialDays")}
                <input name="trialDays" type="number" min={1} max={90} defaultValue={14} />
              </label>
              <label>
                {t("subscriptions.reason")}
                <input name="reason" maxLength={500} />
              </label>
              <button className="button">{t("subscriptions.apply")}</button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
