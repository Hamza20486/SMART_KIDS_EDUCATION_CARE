"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateForm } from "./create-form";
import { useI18n } from "./i18n-provider";
import { translateLegacyPhrase } from "@/lib/i18n/legacy";
import { formatDate, formatMoney } from "@/lib/i18n/format";

type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};
type Column = { key: string; label: string; format?: "date" | "money" };

function valueAt(row: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>(
    (value, key) =>
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined,
    row,
  );
}

export function ModuleView({
  title,
  subtitle,
  endpoint,
  columns,
  fields,
  formTitle,
}: {
  title: string;
  subtitle: string;
  endpoint: string;
  columns: Column[];
  fields?: Field[];
  formTitle?: string;
}) {
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(endpoint);
    if (response.ok) setRows(await response.json());
    setLoading(false);
  }, [endpoint]);
  useEffect(() => void load(), [load]);
  return (
    <>
      <div className="pagehead"><div><h1>{title}</h1><p className="muted">{subtitle}</p></div></div>
      {fields && (
        <div onSubmitCapture={() => setTimeout(load, 500)}>
          <CreateForm endpoint={endpoint} title={formTitle || `${t("common.add")} — ${title}`} fields={fields} />
        </div>
      )}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <table className="table">
          <thead><tr>{columns.map((column) => <th key={column.key}>{translateLegacyPhrase(column.label, t)}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="muted">{t("common.noData")}</td></tr>
            ) : (
              rows.map((row, index) => (
                <tr key={String(row.id || index)}>
                  {columns.map((column) => {
                    const value = valueAt(row, column.key);
                    let text = value == null ? "—" : String(value);
                    if (column.format === "date" && value) text = formatDate(locale, String(value));
                    if (column.format === "money" && value != null) text = formatMoney(locale, Number(value));
                    return <td key={column.key}>{text}</td>;
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
