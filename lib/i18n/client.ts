import { defaultLocale, isLocale } from "./config";
import { translate, type MessageKey } from "./index";

export function clientTranslate(
  key: MessageKey,
  values?: Record<string, string | number>,
) {
  const documentLocale =
    typeof document === "undefined" ? defaultLocale : document.documentElement.lang;
  const locale = isLocale(documentLocale) ? documentLocale : defaultLocale;
  return translate(locale, key, values);
}
