"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "./i18n-provider";
import { Settings, Save, Loader2 } from "lucide-react";

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
    <form className="card form" onSubmit={save} style={{ padding: 28, borderRadius: 20 }}>
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "var(--brand-light)",
            color: "var(--brand)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Settings size={20} />
        </div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
          Paramètres de l’établissement
        </h2>
      </div>

      <label>
        <span>{t("common.name")}</span>
        <input name="name" defaultValue={initial.name} required />
      </label>

      <label>
        <span>{t("common.phone")}</span>
        <input name="phone" defaultValue={initial.phone || ""} placeholder="06 61 28 22 88" />
      </label>

      <label>
        <span>{t("common.email")}</span>
        <input name="email" type="email" defaultValue={initial.email || ""} placeholder="contact@smartkids.ma" />
      </label>

      <label>
        <span>{t("common.address")}</span>
        <input name="address" defaultValue={initial.address || ""} placeholder="Villa 114, Fadell-allah, Tit Melil" />
      </label>

      <label style={{ gridColumn: "1/-1" }}>
        <span>{t("common.language")}</span>
        <select name="defaultLanguage" defaultValue={initial.defaultLanguage}>
          <option value="fr">{t("settings.french")}</option>
          <option value="ar">{t("settings.arabic")}</option>
          <option value="en">{t("settings.english")}</option>
        </select>
      </label>

      <button className="button" disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> {t("common.saving")}
          </>
        ) : (
          <>
            <Save size={16} /> {t("common.save")}
          </>
        )}
      </button>
    </form>
  );
}
