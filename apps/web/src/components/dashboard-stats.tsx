import { Users, FileText, Activity } from "lucide-react";
import { Card } from "@sehatvault/ui";
import type { DashboardStats } from "@sehatvault/core";

export function DashboardStatsRow({
  stats,
  labels,
}: {
  stats: DashboardStats;
  labels: { members: string; records: string; recent: string };
}) {
  const items = [
    { icon: Users, value: stats.memberCount, label: labels.members },
    { icon: FileText, value: stats.recordCount, label: labels.records },
    { icon: Activity, value: stats.recentCount, label: labels.recent },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, value, label }) => (
        <Card key={label} elevation={1} className="p-4">
          <Icon className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">
            {value}
          </p>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
        </Card>
      ))}
    </div>
  );
}
