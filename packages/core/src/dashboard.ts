export interface DashboardStats {
  memberCount: number;
  recordCount: number;
  recentCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function summarizeDashboard(
  members: { id: string }[],
  records: { id: string; created_at: string }[],
  now: Date,
): DashboardStats {
  const cutoff = now.getTime() - SEVEN_DAYS_MS;
  const recentCount = records.filter((r) => new Date(r.created_at).getTime() >= cutoff).length;
  return { memberCount: members.length, recordCount: records.length, recentCount };
}
