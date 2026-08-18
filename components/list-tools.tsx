"use client";

import Link from "next/link";
import { useI18n } from "./i18n-provider";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

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
      <div style={{ position: "relative", flexGrow: 1, maxWidth: 420 }}>
        <Search
          size={18}
          color="var(--muted)"
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        />
        <input
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder ?? t("common.search")}
          style={{ paddingLeft: 42, width: "100%" }}
        />
      </div>
      <button className="button" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Search size={15} /> {t("common.search")}
      </button>
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
    <nav className="pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
      <span className="muted" style={{ fontWeight: 600 }}>
        {t("common.pageResults", { page, pages, total })}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {page > 1 && (
          <Link
            className="button secondary"
            href={`?q=${encodeURIComponent(q)}&page=${page - 1}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <ChevronLeft size={16} /> {t("common.previous")}
          </Link>
        )}
        {page < pages && (
          <Link
            className="button secondary"
            href={`?q=${encodeURIComponent(q)}&page=${page + 1}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            {t("common.next")} <ChevronRight size={16} />
          </Link>
        )}
      </div>
    </nav>
  );
}
