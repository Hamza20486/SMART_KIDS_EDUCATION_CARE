import { describe, expect, it } from "vitest";
import {
  createTranslator,
  localizePaymentMethod,
  localizeStatus,
  statusMessageKey,
  translate,
} from "@/lib/i18n";
import { formatDate, formatDateTime, formatMoney } from "@/lib/i18n/format";
import { translateLegacyPhrase } from "@/lib/i18n/legacy";

describe("localization helpers", () => {
  it("localizes known statuses and preserves forward-compatible unknown values", () => {
    const t = createTranslator("en");
    expect(statusMessageKey("PAID")).toBe("status.paid");
    expect(localizeStatus(t, "PAID")).toBe("Paid");
    expect(localizeStatus(t, "FUTURE_STATUS")).toBe("FUTURE_STATUS");
  });

  it("localizes manual payment methods with a safe fallback", () => {
    const t = createTranslator("fr");
    expect(localizePaymentMethod(t, "BANK_TRANSFER")).toBe("Virement");
    expect(localizePaymentMethod(t, "FUTURE_METHOD")).toBe("FUTURE_METHOD");
  });

  it("interpolates every matching placeholder", () => {
    expect(translate("en", "parent.greeting", { name: "Sara" })).toBe("Hello Sara");
    const t = createTranslator("ar");
    expect(t("reports.hours", { count: 4 })).toContain("4");
  });

  it("formats dates, date-times, and money in the selected Morocco locale", () => {
    const value = new Date("2026-08-17T12:30:00.000Z");
    expect(formatDate("en", value)).toContain("2026");
    expect(formatDateTime("fr", value)).toMatch(/2026/);
    expect(formatMoney("ar", 29_900)).toMatch(/299|٢٩٩/);
  });

  it("translates legacy labels while preserving unknown dynamic copy", () => {
    const t = createTranslator("en");
    expect(translateLegacyPhrase("Prénom", t)).toBe("First name");
    expect(translateLegacyPhrase("Custom label", t)).toBe("Custom label");
  });
});
