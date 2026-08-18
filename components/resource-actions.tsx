"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { translateLegacyPhrase } from "@/lib/i18n/legacy";

type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
};

export function UpdateForm({
  endpoint,
  fields,
  title,
}: {
  endpoint: string;
  fields: Field[];
  title?: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(t("common.retry"));
      return;
    }
    toast.success(t("common.save"));
    router.refresh();
  }
  return (
    <form className="card form" onSubmit={submit}>
      <h2 style={{ gridColumn: "1/-1" }}>{title ? translateLegacyPhrase(title, t) : t("common.edit")}</h2>
      {fields.map((field) => (
        <label key={field.name}>
          {translateLegacyPhrase(field.label, t)}
          {field.options ? (
            <select name={field.name} defaultValue={String(field.value ?? "")}>
              {field.options.map((option) => (
                <option key={option.value} value={option.value}>{translateLegacyPhrase(option.label, t)}</option>
              ))}
            </select>
          ) : (
            <input name={field.name} type={field.type || "text"} defaultValue={field.value} />
          )}
        </label>
      ))}
      <button className="button" disabled={busy}>{t("common.save")}</button>
    </form>
  );
}

export function ActionButton({
  endpoint,
  label,
  method = "PATCH",
  body,
}: {
  endpoint: string;
  label: string;
  method?: "PATCH" | "POST";
  body?: unknown;
}) {
  const { t } = useI18n();
  const router = useRouter();
  async function run() {
    const response = await fetch(endpoint, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    toast[response.ok ? "success" : "error"](
      response.ok ? t("common.save") : t("common.retry"),
    );
    if (response.ok) router.refresh();
  }
  return <button className="button" onClick={run}>{translateLegacyPhrase(label, t)}</button>;
}

export function DangerButton({
  endpoint,
  label,
  redirectTo,
  body,
}: {
  endpoint: string;
  label?: string;
  redirectTo?: string;
  body?: unknown;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const visibleLabel = label ? translateLegacyPhrase(label, t) : t("common.archive");
  async function run() {
    if (!confirm(`${t("common.confirm")} : ${visibleLabel} ?`)) return;
    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      toast.error(t("common.retry"));
      return;
    }
    toast.success(t("common.save"));
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  }
  return <button className="button secondary" onClick={run}>{visibleLabel}</button>;
}
