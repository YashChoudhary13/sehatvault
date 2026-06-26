"use client";

import { useEffect, useState } from "react";
import { useT } from "@/components/locale-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function SwRegister() {
  const t = useT();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration failure should not block the app shell.
    });
  }, []);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function onAppInstalled() {
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  const promptEvent = installPrompt;

  async function handleInstall() {
    setInstallPrompt(null);
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
  }

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label={t("pwa.install.aria")}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-40 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(15,118,110,0.75)] transition-[transform,filter] duration-150 ease-[var(--ease-out)] hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary/20 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 md:bottom-5"
    >
      {t("pwa.install")}
    </button>
  );
}
