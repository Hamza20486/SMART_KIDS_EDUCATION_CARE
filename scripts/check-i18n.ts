import { ar } from "../lib/i18n/messages/ar";
import { en } from "../lib/i18n/messages/en";
import { fr } from "../lib/i18n/messages/fr";

const reference = Object.keys(fr).sort();
for (const [locale, dictionary] of Object.entries({ ar, en })) {
  const keys = Object.keys(dictionary).sort();
  const missing = reference.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !reference.includes(key));
  const empty = Object.entries(dictionary)
    .filter(([, value]) => !value.trim())
    .map(([key]) => key);
  if (missing.length || extra.length || empty.length) {
    console.error({ locale, missing, extra, empty });
    process.exitCode = 1;
  }
}
if (!process.exitCode) {
  console.log(`Translations valid: ${reference.length} keys in fr, ar and en.`);
}
