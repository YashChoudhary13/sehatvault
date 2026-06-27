import { cn } from "./cn";

const FIELD: Record<"hero" | "section" | "glow", string> = {
  hero: "[background:var(--mesh-hero)]",
  section: "[background:var(--mesh-section)]",
  glow: "[background:var(--glow-accent)]",
};

export function GradientField({
  variant = "section",
  className,
}: {
  variant?: "hero" | "section" | "glow";
  className?: string;
}) {
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", FIELD[variant], className)} />;
}
