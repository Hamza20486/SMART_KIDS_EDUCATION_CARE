"use client";

import { clientTranslate } from "@/lib/i18n/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { formatDateTime } from "@/lib/i18n/format";
import {
  Building2,
  Users,
  Baby,
  HardDrive,
  Clock,
  History,
  Sparkles,
} from "lucide-react";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {organizations.map((organization) => {
        const subscription = organization.subscription;
        const usage = organization.usage;
        return (
          <article
            className="card"
            key={organization.id}
            style={{
              padding: 28,
              borderRadius: 20,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
                paddingBottom: 16,
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "var(--brand-light)",
                    color: "var(--brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: 18, margin: "0 0 2px" }}>{organization.name}</h2>
                  <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                    📍 {organization.city} • Formule :{" "}
                    <span style={{ fontWeight: 700, color: "var(--brand)" }}>
                      {subscription?.plan.name ?? "Sans plan"}
                    </span>
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className={`badge ${
                    subscription?.status === "ACTIVE" || subscription?.status === "TRIAL"
                      ? "badge-success"
                      : "badge-warning"
                  }`}
                  style={{ fontSize: 12 }}
                >
                  ● {subscription?.status ?? "NON CONFIGURÉ"}
                </span>
              </div>
            </div>

            {subscription && (
              <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                <Clock size={14} />
                <span>
                  {t("subscriptions.periodEnd", {
                    date: formatDateTime(locale, subscription.currentPeriodEnd),
                  })}
                  {subscription.trialEndsAt
                    ? ` • ${t("subscriptions.trialEnd", {
                        date: formatDateTime(locale, subscription.trialEndsAt),
                      })}`
                    : ""}
                </span>
              </div>
            )}

            {/* Usage Meters */}
            {usage && (
              <div className="grid" style={{ marginBottom: 24 }}>
                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <Baby size={16} color="var(--brand)" /> {t("subscriptions.usageChildren")}
                    </span>
                    <strong style={{ fontSize: 14 }}>
                      {usage.children}/{usage.limits.children}
                    </strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent(usage.children, usage.limits.children)}%`,
                        background: "var(--brand)",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <Users size={16} color="var(--teal)" /> {t("subscriptions.usageStaff")}
                    </span>
                    <strong style={{ fontSize: 14 }}>
                      {usage.staff}/{usage.limits.staff}
                    </strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent(usage.staff, usage.limits.staff)}%`,
                        background: "var(--teal)",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                      <HardDrive size={16} color="var(--indigo)" /> {t("subscriptions.storage")}
                    </span>
                    <strong style={{ fontSize: 14 }}>
                      {(usage.storageBytes / 1_048_576).toFixed(1)} / {(usage.limits.storageBytes / 1_048_576).toFixed(0)} Mo
                    </strong>
                  </div>
                  <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent(usage.storageBytes, usage.limits.storageBytes)}%`,
                        background: "var(--indigo)",
                        borderRadius: 99,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {subscription?.events.length ? (
              <details
                style={{
                  marginBottom: 20,
                  padding: "12px 16px",
                  background: "var(--paper)",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                  fontSize: 13.5,
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <History size={15} /> {t("subscriptions.history")} ({subscription.events.length})
                </summary>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {subscription.events.map((item) => (
                    <p className="muted" key={item.id} style={{ margin: 0, fontSize: 12.5 }}>
                      {formatDateTime(locale, item.createdAt)} — <strong>{item.action}</strong>
                      {item.fromPlanCode || item.toPlanCode
                        ? ` (${item.fromPlanCode ?? "—"} → ${item.toPlanCode ?? "—"})`
                        : ""}
                      {item.fromStatus || item.toStatus
                        ? ` [${item.fromStatus ?? "—"} → ${item.toStatus ?? "—"}]`
                        : ""}
                    </p>
                  ))}
                </div>
              </details>
            ) : null}

            {/* Plan Modification Form */}
            <form className="form" onSubmit={(event) => update(event, organization.id)}>
              <label>
                <span>{t("common.action")}</span>
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
                <span>{t("subscriptions.plan")}</span>
                <select name="planCode" defaultValue={subscription?.plan.code ?? plans[0]?.code}>
                  {plans.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name} — {(plan.priceCentimes / 100).toFixed(0)} DH
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>{t("subscriptions.months")}</span>
                <input name="periodMonths" type="number" min={1} max={24} defaultValue={1} />
              </label>

              <label>
                <span>{t("subscriptions.trialDays")}</span>
                <input name="trialDays" type="number" min={1} max={90} defaultValue={14} />
              </label>

              <label style={{ gridColumn: "1/-1" }}>
                <span>{t("subscriptions.reason")}</span>
                <input name="reason" maxLength={500} placeholder="Motif du changement..." />
              </label>

              <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Sparkles size={15} /> {t("subscriptions.apply")}
              </button>
            </form>
          </article>
        );
      })}
    </div>
  );
}
