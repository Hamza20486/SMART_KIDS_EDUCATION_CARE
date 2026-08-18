import type { Locale } from "./config";

const localeTags: Record<Locale, string> = {
  fr: "fr-MA",
  ar: "ar-MA",
  en: "en-MA",
};

export function formatDate(
  locale: Locale,
  value: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat(localeTags[locale], {
    timeZone: "Africa/Casablanca",
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(locale: Locale, value: Date | string) {
  return formatDate(locale, value, { dateStyle: "medium", timeStyle: "short" });
}

export function formatMoney(locale: Locale, centimes: number) {
  return new Intl.NumberFormat(localeTags[locale], {
    style: "currency",
    currency: "MAD",
    minimumFractionDigits: 2,
  }).format(centimes / 100);
}
