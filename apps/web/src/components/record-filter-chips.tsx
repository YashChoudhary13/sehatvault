"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { t as catalogT, type Locale } from "@sehatvault/i18n";
import { RecordCard } from "@/components/record-card";

export type HealthRecord = {
  id: string;
  title: string | null;
  type: string;
  ocr_status: string;
  source: string;
  record_date: string | null;
  file_object_key: string | null;
  created_at: string;
  member_id: string;
};

interface Props {
  records: HealthRecord[];
  memberNames: Record<string, string>;
  locale: Locale;
}

// Canonical display order for filter chips
const ORDERED_TYPES = [
  "prescription",
  "lab_report",
  "scan",
  "discharge",
  "vaccination",
  "bill",
  "other",
] as const;

type DateGroup = { bucket: string; label: string; records: HealthRecord[] };

function getDateBucket(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  if (date >= todayStart) return "__today__";
  if (date >= weekStart) return "__this_week__";
  // YYYY-MM as a sort key — descending string sort gives correct chronological order
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function groupRecords(
  records: HealthRecord[],
  locale: Locale,
  translate: (key: string) => string,
): DateGroup[] {
  const map = new Map<string, DateGroup>();

  for (const record of records) {
    const dateStr = record.record_date ?? record.created_at;
    const bucket = getDateBucket(dateStr);

    if (!map.has(bucket)) {
      let label: string;
      if (bucket === "__today__") {
        label = translate("records.timeline.today");
      } else if (bucket === "__this_week__") {
        label = translate("records.timeline.this_week");
      } else {
        const [yearStr, monthStr] = bucket.split("-");
        const d = new Date(Number(yearStr), Number(monthStr) - 1, 1);
        label = d.toLocaleDateString(locale === "hi" ? "hi-IN" : "en-IN", {
          month: "long",
          year: "numeric",
        });
      }
      map.set(bucket, { bucket, label, records: [] });
    }
    map.get(bucket)!.records.push(record);
  }

  // Sort order: today → this_week → month buckets newest-first
  const result: DateGroup[] = [];
  if (map.has("__today__")) result.push(map.get("__today__")!);
  if (map.has("__this_week__")) result.push(map.get("__this_week__")!);
  [...map.keys()]
    .filter((k) => !k.startsWith("__"))
    .sort((a, b) => b.localeCompare(a))
    .forEach((k) => result.push(map.get(k)!));

  return result;
}

export function RecordFilterChips({ records, memberNames, locale }: Props) {
  const [activeType, setActiveType] = useState("all");

  const translate = useMemo(
    () => (key: string) => catalogT(locale, key),
    [locale],
  );

  // Only surface chips for record types actually present in the data
  const availableTypes = useMemo(() => {
    const present = new Set(records.map((r) => r.type));
    return ORDERED_TYPES.filter((t) => present.has(t));
  }, [records]);

  const filtered = useMemo(
    () =>
      activeType === "all"
        ? records
        : records.filter((r) => r.type === activeType),
    [records, activeType],
  );

  const groups = useMemo(
    () => groupRecords(filtered, locale, translate),
    [filtered, locale, translate],
  );

  return (
    <div>
      {/* Filter chip row — only shown when >1 type present */}
      {availableTypes.length > 1 && (
        <div
          className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          role="group"
          aria-label={translate("records.filter.all")}
        >
          {(["all", ...availableTypes] as string[]).map((type) => {
            const label =
              type === "all"
                ? translate("records.filter.all")
                : translate(`records.type.${type}`);
            const active = activeType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveType(type)}
                aria-pressed={active}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium",
                  "transition-[background-color,color,border-color] duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  "active:scale-[0.97]",
                  active
                    ? "bg-primary text-surface"
                    : "border border-border bg-surface text-muted hover:border-primary/40 hover:text-ink",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Grouped timeline */}
      {groups.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          {translate("records.empty.description")}
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.bucket} aria-label={group.label}>
              {/* Date section header */}
              <div className="mb-3 flex items-center gap-3">
                <h2 className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-border" aria-hidden="true" />
              </div>

              <ul className="space-y-2.5">
                {group.records.map((record) => {
                  const memberName = memberNames[record.member_id] ?? "—";
                  const title =
                    record.title ??
                    record.file_object_key?.split("/").pop() ??
                    translate("records.detail.untitled");
                  const typeLabel = translate(`records.type.${record.type}`);
                  const statusLabel = translate(
                    `records.status.${record.ocr_status}`,
                  );
                  const dateStr = record.record_date ?? record.created_at;
                  const displayDate = new Date(dateStr).toLocaleDateString(
                    locale === "hi" ? "hi-IN" : "en-IN",
                    { day: "numeric", month: "short", year: "numeric" },
                  );

                  return (
                    <li key={record.id}>
                      <RecordCard
                        id={record.id}
                        title={title}
                        type={record.type}
                        ocrStatus={record.ocr_status}
                        statusLabel={statusLabel}
                        typeLabel={typeLabel}
                        memberName={memberName}
                        displayDate={displayDate}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
