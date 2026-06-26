"use client";

import { useEffect, useState } from "react";

export type MotionTier = "calm" | "standard" | "expressive";

const RISE: Record<MotionTier, number> = { calm: 4, standard: 12, expressive: 24 };
const DURATION_S: Record<MotionTier, number> = { calm: 0.2, standard: 0.36, expressive: 0.6 };

export interface MotionSpec {
  initial: Record<string, number>;
  animate: Record<string, number>;
  transition: { duration: number; ease: number[] };
}

const EASE_OUT = [0.23, 1, 0.32, 1];

export function resolveMotion(tier: MotionTier, reduced: boolean): MotionSpec {
  if (reduced) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.01, ease: EASE_OUT } };
  }
  return {
    initial: { opacity: 0, y: RISE[tier] },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION_S[tier], ease: EASE_OUT },
  };
}

/** Elder mode is signalled by data-elder="true" on <html> (set by ElderModeProvider, M3). */
function prefersReduced(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elder = document.documentElement.dataset.elder === "true";
  return mq || elder;
}

export function useMotionTier(tier: MotionTier): MotionSpec {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    setReduced(prefersReduced());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(prefersReduced());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return resolveMotion(tier, reduced);
}
