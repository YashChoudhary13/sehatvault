"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { verifyAppLockPin } from "@/lib/pin-actions";
import { PinPad } from "@/components/pin-pad";
import { Button } from "@/components/ui/button";
import { t } from "@sehatvault/i18n";

const LOCALE = "en" as const;
const IDLE_MS = 5 * 60 * 1000;
const SESSION_KEY = "sv_unlocked_at";

function isSessionFresh(): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    return Date.now() - parseInt(raw, 10) < IDLE_MS;
  } catch {
    return false; // sessionStorage unavailable (strict private browsing)
  }
}

function markUnlocked(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // continue without persisting — next load will re-challenge, which is safe
  }
}

// ── Lock screen overlay ────────────────────────────────────────────────────
interface PinLockScreenProps {
  onUnlock: () => void;
  onForgot: () => void;
}

function PinLockScreen({ onUnlock, onForgot }: PinLockScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyAppLockPin(pin);
    setLoading(false);
    if (result.rateLimited) {
      setRateLimited(true);
      setPin("");
      return;
    }
    if (result.ok) {
      onUnlock();
    } else {
      setError(t(LOCALE, "pin.lock.wrong"));
      setPin("");
    }
  }

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-bg p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-primary-ink">
          {t(LOCALE, "pin.lock.title")}
        </h1>
        <p className="text-sm text-muted">{t(LOCALE, "pin.lock.subtitle")}</p>
      </div>

      {rateLimited ? (
        <p className="max-w-xs text-center text-sm text-danger">
          {t(LOCALE, "pin.lock.rateLimited")}
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-xs flex-col gap-6"
        >
          <PinPad
            value={pin}
            onChange={setPin}
            maxLength={6}
            autoFocus
            disabled={loading}
          />
          {error ? (
            <p className="text-center text-sm text-danger">{error}</p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={loading || pin.length < 4}
          >
            {loading ? "…" : t(LOCALE, "pin.lock.unlock")}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onForgot}
        className="text-sm text-muted underline"
      >
        {t(LOCALE, "pin.lock.forgot")}
      </button>
    </main>
  );
}

// ── AppShell — manages lock state, wraps authenticated children ────────────
interface AppShellProps {
  hasPinSet: boolean;
  children: React.ReactNode;
}

export function AppShell({ hasPinSet, children }: AppShellProps) {
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  // Determine initial lock state after mount (sessionStorage is client-only)
  useEffect(() => {
    if (hasPinSet && !isSessionFresh()) {
      setIsLocked(true);
    }
  }, [hasPinSet]);

  // Re-lock when the tab becomes visible after an idle period
  useEffect(() => {
    if (!hasPinSet) return;
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && !isSessionFresh()) {
        setIsLocked(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [hasPinSet]);

  const unlock = useCallback(() => {
    markUnlocked();
    setIsLocked(false);
  }, []);

  if (isLocked) {
    return (
      <PinLockScreen
        onUnlock={unlock}
        onForgot={() => router.push("/login")}
      />
    );
  }

  return <>{children}</>;
}
