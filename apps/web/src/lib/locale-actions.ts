"use server";

import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@sehatvault/i18n";

export async function updateUserLocale(locale: Locale): Promise<{ ok: boolean }> {
  if (locale !== "en" && locale !== "hi") return { ok: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("app_user")
    .update({ locale })
    .eq("id", user.id);

  return { ok: !error };
}
