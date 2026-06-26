import { RecordSkeletonList } from "@/components/record-skeleton";

export default function RecordsLoading() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Header skeleton — matches RecordsPage header layout */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="h-8 w-32 rounded-lg bg-border animate-pulse motion-reduce:animate-none" />
        <div className="h-9 w-28 rounded-lg bg-border animate-pulse motion-reduce:animate-none" />
      </div>

      <RecordSkeletonList count={4} />
    </main>
  );
}
