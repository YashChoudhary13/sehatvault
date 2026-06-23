import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-border">
        <Icon className="h-8 w-8 text-muted" />
      </div>
      <div className="max-w-xs space-y-1">
        <h2 className="text-lg font-semibold text-primary-ink">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {actionButton ? <div>{actionButton}</div> : null}
    </div>
  );
}
