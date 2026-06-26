import { cn } from "@/lib/utils";

function RecordSkeleton() {
  return (
    <div className="flex min-h-[4rem] items-center gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="h-10 w-10 shrink-0 rounded-full bg-border animate-pulse motion-reduce:animate-none" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-border animate-pulse motion-reduce:animate-none" />
        <div className="h-3 w-2/5 rounded bg-border animate-pulse motion-reduce:animate-none" />
      </div>
      <div className="h-3.5 w-14 shrink-0 rounded bg-border animate-pulse motion-reduce:animate-none" />
    </div>
  );
}

export function RecordSkeletonList({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3", className)}
      aria-busy="true"
      aria-label="Loading records"
    >
      {Array.from({ length: count }, (_, i) => (
        <RecordSkeleton key={i} />
      ))}
    </div>
  );
}
