import "./globals.css";
import "./ui-refresh.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { getLocale } from "@/lib/i18n/server";
import { direction } from "@/lib/i18n/config";
import { messages } from "@/lib/i18n";
import { I18nProvider } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";

export const metadata: Metadata = {
  title: "Smart Kids Education Care — Crèche & Maternelle d'Excellence",
  description: "Crèche et maternelle privée à Tit Melil, Casablanca. Un environnement bienveillant pour l'éveil, l'apprentissage et l'épanouissement de votre enfant.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌟</text></svg>",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={direction(locale)}>
      <body>
        <I18nProvider locale={locale} messages={messages[locale]}>
          <LanguageSwitcher />
          {children}
          <Toaster richColors position={locale === "ar" ? "top-left" : "top-right"} />
        </I18nProvider>
      </body>
    </html>
  );
}
