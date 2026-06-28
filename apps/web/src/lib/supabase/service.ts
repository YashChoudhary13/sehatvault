import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

// Service-role client: bypasses RLS. SERVER-ONLY. Never import into a client component.
export function createServiceClient() {
  return createSupabaseClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL ?? "",
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
