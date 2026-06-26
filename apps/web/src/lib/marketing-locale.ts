import { cookies } from "next/headers";
import type { Locale } from "@sehatvault/i18n";

export async function getMarketingLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get("NEXT_LOCALE")?.value;
  return v === "hi" ? "hi" : "en";
}
