import en from "./en.json";
import hi from "./hi.json";

export type Locale = "en" | "hi";

const catalogs: Record<Locale, Record<string, string>> = { en, hi };

export function t(locale: Locale, key: string): string {
  return catalogs[locale]?.[key] ?? catalogs.en[key] ?? key;
}
