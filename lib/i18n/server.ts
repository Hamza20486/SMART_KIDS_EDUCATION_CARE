import { headers } from "next/headers";
import { defaultLocale, isLocale, type Locale } from "./config";
import { createTranslator } from "./index";

export async function getLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-smart-kids-locale");
  return isLocale(locale) ? locale : defaultLocale;
}

export async function getTranslations() {
  return createTranslator(await getLocale());
}
