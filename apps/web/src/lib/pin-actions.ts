"use server";

import { hash, verify } from "@node-rs/argon2";
import { validatePin } from "@sehatvault/core";
import { createClient } from "@/lib/supabase/server";

export type PinActionResult = { ok: true } | { ok: false; error: string };

// Best-effort in-process rate limit. Single-process MVP only (Render).
// Replace with a DB counter or Upstash Redis before horizontal scaling.
const _attempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function consumeRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = _attempts.get(userId);
  if (!entry || entry.resetAt < now) {
    _attempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count += 1;
  return true;
}

export async function setAppLockPin(pin: string): Promise<PinActionResult> {
  const validation = validatePin(pin);
  if (!validation.valid) return { ok: false, error: validation.reason };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const pinHash = await hash(pin);

  const { error } = await supabase
    .from("app_user")
    .update({ app_lock_hash: pinHash })
    .eq("id", user.id);

  if (error) return { ok: false, error: "db_error" };
  return { ok: true };
}

export async function verifyAppLockPin(
  pin: string,
): Promise<{ ok: boolean; rateLimited?: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  if (!consumeRateLimit(user.id)) return { ok: false, rateLimited: true };

  const { data } = await supabase
    .from("app_user")
    .select("app_lock_hash")
    .eq("id", user.id)
    .single();

  if (!data?.app_lock_hash) return { ok: false };

  const match = await verify(data.app_lock_hash, pin);
  return { ok: match };
}

export async function clearAppLockPin(): Promise<PinActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("app_user")
    .update({ app_lock_hash: null })
    .eq("id", user.id);

  if (error) return { ok: false, error: "db_error" };
  return { ok: true };
}

export async function getHasPinSet(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("app_user")
    .select("app_lock_hash")
    .eq("id", user.id)
    .single();

  return data?.app_lock_hash != null;
}
