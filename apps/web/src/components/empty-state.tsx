import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: ReactNode;
  /** "error" uses danger-tinted icon circle; default is primary-tinted. */
  intent?: "default" | "error";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
  intent = "default",
}: EmptyStateProps) {
  const isError = intent === "error";
  return (
    <div className="flex flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <div
        className={cn(
          "flex h-16 w-16 items-center justify-center rounded-full",
          isError ? "bg-danger/10" : "bg-primary/10",
        )}
      >
        <Icon
          className={cn("h-8 w-8", isError ? "text-danger" : "text-primary")}
          aria-hidden="true"
        />
      </div>
      <div className="max-w-xs space-y-1">
        <h2 className="text-lg font-semibold text-primary-ink">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {actionButton ? <div>{actionButton}</div> : null}
    </div>
  );
}
