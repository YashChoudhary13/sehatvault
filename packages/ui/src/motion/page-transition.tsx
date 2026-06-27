"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionTier } from "./use-motion-tier";

export function PageTransition({ children }: { children: ReactNode }) {
  const m = useMotionTier("calm");
  return (
    <motion.div initial={m.initial} animate={m.animate} transition={m.transition}>
      {children}
    </motion.div>
  );
}
