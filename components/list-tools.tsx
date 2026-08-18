"use client";

import Link from "next/link";
import { useI18n } from "./i18n-provider";

export function SearchBar({
  defaultValue = "",
  placeholder,
}: {
  defaultValue?: string;
  placeholder?: string;
}) {
  const { t } = useI18n();
  return (
    <form className="searchbar">
      <input name="q" defaultValue={defaultValue} placeholder={placeholder ?? t("common.search")} />
      <button className="button">{t("common.search")}</button>
    </form>
  );
}

export function Pagination({
  page,
  total,
  pageSize,
  q = "",
}: {
  page: number;
  total: number;
  pageSize: number;
  q?: string;
}) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="pagination">
      <span>{t("common.pageResults", { page, pages, total })}</span>
      {page > 1 && (
        <Link className="button secondary" href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}>
          {t("common.previous")}
        </Link>
      )}
      {page < pages && (
        <Link className="button secondary" href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}>
          {t("common.next")}
        </Link>
      )}
    </nav>
  );
}
