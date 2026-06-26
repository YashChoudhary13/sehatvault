"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Locale } from "@sehatvault/i18n";

export async function setMarketingLocale(locale: Locale): Promise<void> {
  if (locale !== "en" && locale !== "hi") return;
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/");
  redirect("/");
}
