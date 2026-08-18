"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/lib/i18n/config";
import {
  createTranslator,
  statusMessageKey,
  type MessageKey,
  type Messages,
} from "@/lib/i18n";

const I18nContext = createContext<{
  locale: Locale;
  messages: Messages;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
} | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, messages, t: createTranslator(locale) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function T({
  k,
  values,
}: {
  k: MessageKey;
  values?: Record<string, string | number>;
}) {
  const { t } = useI18n();
  return <>{t(k, values)}</>;
}

export function StatusText({ status }: { status: string }) {
  const { t } = useI18n();
  const key = statusMessageKey(status);
  return <>{key ? t(key) : status}</>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
