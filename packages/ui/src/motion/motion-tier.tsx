"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionTier, type MotionTier as Tier } from "./use-motion-tier";

export function MotionTier({
  tier,
  children,
  className,
}: {
  tier: Tier;
  children: ReactNode;
  className?: string;
}) {
  const m = useMotionTier(tier);
  return (
    <motion.div className={className} initial={m.initial} animate={m.animate} transition={m.transition}>
      {children}
    </motion.div>
  );
}
