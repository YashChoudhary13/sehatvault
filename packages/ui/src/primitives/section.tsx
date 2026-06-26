import type { ReactNode } from "react";
import { cn } from "./cn";

export function Section({
  tint = false,
  className,
  children,
}: {
  tint?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("relative", tint && "bg-[var(--color-tint)]", className)}>{children}</section>
  );
}
