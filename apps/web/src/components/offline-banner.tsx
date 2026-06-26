"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useT } from "@/components/locale-provider";

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const reducedMotion = useReducedMotion();
  const translate = useT();

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Stays in DOM so both enter and exit transitions fire.
  // Normal: slides above viewport when online, slides down when offline.
  // Reduced motion: opacity-only fade; no movement.
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isOffline}
      className="fixed inset-x-0 top-0 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-sm text-bg"
      style={{
        transform: reducedMotion
          ? undefined
          : isOffline
            ? "translateY(0)"
            : "translateY(-100%)",
        opacity: reducedMotion ? (isOffline ? 1 : 0) : 1,
        transition: reducedMotion
          ? "opacity 150ms ease"
          : "transform 250ms var(--ease-drawer)",
        pointerEvents: isOffline ? "auto" : "none",
      }}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="font-medium">{translate("offline.banner.message")}</span>
      <span className="hidden text-bg/60 sm:inline">
        — {translate("offline.banner.sub")}
      </span>
    </div>
  );
}
