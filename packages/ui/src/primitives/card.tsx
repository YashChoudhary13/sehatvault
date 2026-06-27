import type { ReactNode } from "react";
import { cn } from "./cn";

const ELEV: Record<1 | 2 | 3 | 4, string> = {
  1: "[box-shadow:var(--elev-1)]",
  2: "[box-shadow:var(--elev-2)]",
  3: "[box-shadow:var(--elev-3)]",
  4: "[box-shadow:var(--elev-4)]",
};

export function Card({
  elevation = 1,
  interactive = false,
  className,
  children,
}: {
  elevation?: 1 | 2 | 3 | 4;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        ELEV[elevation],
        interactive &&
          "transition-[transform,box-shadow] duration-[var(--motion-standard)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--elev-3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
