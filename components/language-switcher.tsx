"use client";

import { usePathname, useRouter } from "next/navigation";
import { localeNames, locales, type Locale } from "@/lib/i18n/config";
import { useI18n } from "./i18n-provider";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(nextLocale: Locale) {
    const parts = pathname.split("/");
    if (locales.includes(parts[1] as Locale)) parts[1] = nextLocale;
    else parts.splice(1, 0, nextLocale);
    document.cookie = `smart-kids-locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.replace(parts.join("/") || `/${nextLocale}`);
  }

  return (
    <label className="locale-switcher">
      <span className="sr-only">{t("common.language")}</span>
      <select
        aria-label={t("common.language")}
        value={locale}
        onChange={(event) => switchLocale(event.target.value as Locale)}
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {localeNames[item]}
          </option>
        ))}
      </select>
    </label>
  );
}
