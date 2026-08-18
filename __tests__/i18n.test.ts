import { describe, expect, it } from "vitest";
import { direction } from "@/lib/i18n/config";
import { messages, translate } from "@/lib/i18n";
import { formatMoney } from "@/lib/i18n/format";

describe("internationalization", () => {
  it("has identical, non-empty translation keys in every locale", () => {
    const frenchKeys = Object.keys(messages.fr).sort();
    for (const locale of ["ar", "en"] as const) {
      expect(Object.keys(messages[locale]).sort()).toEqual(frenchKeys);
      expect(Object.values(messages[locale]).every((value) => value.length > 0)).toBe(true);
    }
  });

  it("interpolates translated values", () => {
    expect(translate("en", "parent.greeting", { name: "Sara" })).toBe("Hello Sara");
    expect(translate("ar", "notifications.unread", { count: 3 })).toContain("3");
  });

  it("uses RTL only for Arabic", () => {
    expect(direction("ar")).toBe("rtl");
    expect(direction("fr")).toBe("ltr");
    expect(direction("en")).toBe("ltr");
  });

  it("formats MAD with the requested locale", () => {
    expect(formatMoney("fr", 29900)).toContain("299");
    expect(formatMoney("en", 49900)).toContain("499");
  });
});
