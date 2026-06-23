import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let hasPinSet = false;
  if (user) {
    const { data } = await supabase
      .from("app_user")
      .select("app_lock_hash")
      .eq("id", user.id)
      .single();
    hasPinSet = data?.app_lock_hash != null;
  }

  return <AppShell hasPinSet={hasPinSet}>{children}</AppShell>;
}
