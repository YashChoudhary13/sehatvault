"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { verifyAppLockPin } from "@/lib/pin-actions";
import { PinPad } from "@/components/pin-pad";
import { Button } from "@/components/ui/button";
import { LocaleProvider, useT } from "@/components/locale-provider";
import { MainNav } from "@/components/main-nav";
import { OfflineBanner } from "@/components/offline-banner";
import { SwRegister } from "@/components/sw-register";
import type { Locale } from "@sehatvault/i18n";

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
  const translate = useT();
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
      setError(translate("pin.lock.wrong"));
      setPin("");
    }
  }

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-bg p-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold text-primary-ink">
          {translate("pin.lock.title")}
        </h1>
        <p className="text-sm text-muted">{translate("pin.lock.subtitle")}</p>
      </div>

      {rateLimited ? (
        <p className="max-w-xs text-center text-sm text-danger">
          {translate("pin.lock.rateLimited")}
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
            {loading ? "…" : translate("pin.lock.unlock")}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={onForgot}
        className="cursor-pointer rounded text-sm text-muted underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {translate("pin.lock.forgot")}
      </button>
    </main>
  );
}

// ── Lock gate — owns the session-freshness logic ───────────────────────────
function AppLock({
  hasPinSet,
  children,
}: {
  hasPinSet: boolean;
  children: React.ReactNode;
}) {
  const [isLocked, setIsLocked] = useState(false);
  const router = useRouter();

  // Determine initial lock state after mount (sessionStorage is client-only)
  useEffect(() => {
    if (hasPinSet && !isSessionFresh()) setIsLocked(true);
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

  return (
    <>
      <OfflineBanner />
      <MainNav />
      {/*
       * Content offset: desktop gets left margin for side rail (w-56 = 224px).
       * Mobile gets bottom padding tall enough to clear the tab bar + iOS home indicator.
       */}
      <div
        className="min-h-dvh md:pl-56"
        style={{
          paddingBottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </div>
    </>
  );
}

// ── AppShell — provides locale context then enforces the PIN gate ──────────
interface AppShellProps {
  hasPinSet: boolean;
  locale: Locale;
  children: React.ReactNode;
}

export function AppShell({ hasPinSet, locale, children }: AppShellProps) {
  return (
    <LocaleProvider initialLocale={locale}>
      <AppLock hasPinSet={hasPinSet}>{children}</AppLock>
      <SwRegister />
    </LocaleProvider>
  );
}
