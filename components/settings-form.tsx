"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";

export function SettingsForm({
  initial,
}: {
  initial: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    defaultLanguage: string;
  };
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    toast[response.ok ? "success" : "error"](
      response.ok ? t("common.save") : t("common.retry"),
    );
  }
  return (
    <form className="card form" onSubmit={save}>
      <label>{t("common.name")}<input name="name" defaultValue={initial.name} required /></label>
      <label>{t("common.phone")}<input name="phone" defaultValue={initial.phone || ""} /></label>
      <label>{t("common.email")}<input name="email" type="email" defaultValue={initial.email || ""} /></label>
      <label>{t("common.address")}<input name="address" defaultValue={initial.address || ""} /></label>
      <label>
        {t("common.language")}
        <select name="defaultLanguage" defaultValue={initial.defaultLanguage}>
          <option value="fr">{t("settings.french")}</option>
          <option value="ar">{t("settings.arabic")}</option>
          <option value="en">{t("settings.english")}</option>
        </select>
      </label>
      <button className="button" disabled={busy}>{t("common.save")}</button>
    </form>
  );
}
