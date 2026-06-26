import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  intent = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  intent?: "default" | "error";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          intent === "error" ? "bg-[var(--color-danger)]/10" : "bg-[var(--color-tint)]",
        )}
      >
        <Icon className={cn("h-6 w-6", intent === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]")} />
      </span>
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-[var(--color-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}
