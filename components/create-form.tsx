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
  required?: boolean;
  options?: { value: string; label: string }[];
};

export function CreateForm({
  endpoint,
  fields,
  title,
}: {
  endpoint: string;
  fields: Field[];
  title: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(t("common.retry"));
      return;
    }
    toast.success(t("common.save"));
    form.reset();
    router.refresh();
  }
  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <h2>{translateLegacyPhrase(title, t)}</h2>
      <form className="form" onSubmit={submit}>
        {fields.map((field) => (
          <label key={field.name}>
            {translateLegacyPhrase(field.label, t)}
            {field.options ? (
              <select name={field.name} required={field.required}>
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>{translateLegacyPhrase(option.label, t)}</option>
                ))}
              </select>
            ) : (
              <input name={field.name} type={field.type || "text"} required={field.required} />
            )}
          </label>
        ))}
        <button className="button" disabled={busy}>
          {busy ? t("common.saving") : t("common.add")}
        </button>
      </form>
    </section>
  );
}
