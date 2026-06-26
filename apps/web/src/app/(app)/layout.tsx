import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@sehatvault/i18n";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPinSet = false;
  let locale: Locale = "en";

  if (user) {
    const { data } = await supabase
      .from("app_user")
      .select("app_lock_hash, locale")
      .eq("id", user.id)
      .single();
    hasPinSet = data?.app_lock_hash != null;
    const raw = data?.locale;
    locale = raw === "en" || raw === "hi" ? raw : "en";
  }

  return (
    <AppShell hasPinSet={hasPinSet} locale={locale}>
      {children}
    </AppShell>
  );
}
