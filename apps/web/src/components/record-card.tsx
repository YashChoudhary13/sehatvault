import Link from "next/link";
import {
  Pill,
  FlaskConical,
  ScanLine,
  FileHeart,
  Syringe,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PenLine,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, LucideIcon> = {
  prescription: Pill,
  lab_report: FlaskConical,
  scan: ScanLine,
  discharge: FileHeart,
  vaccination: Syringe,
  bill: Receipt,
  other: FileText,
};

const STATUS_ICON: Record<string, LucideIcon> = {
  pending: Clock,
  processing: Loader2,
  done: CheckCircle2,
  needs_review: AlertTriangle,
  failed: XCircle,
  manual: PenLine,
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-warn",
  processing: "text-primary",
  done: "text-success",
  needs_review: "text-warn",
  failed: "text-danger",
  manual: "text-muted",
};

export interface RecordCardProps {
  id: string;
  title: string;
  type: string;
  ocrStatus: string;
  statusLabel: string;
  typeLabel: string;
  memberName: string;
  displayDate: string;
}

export function RecordCard({
  id,
  title,
  type,
  ocrStatus,
  statusLabel,
  typeLabel,
  memberName,
  displayDate,
}: RecordCardProps) {
  const TypeIcon = TYPE_ICON[type] ?? FileText;
  const StatusIcon = STATUS_ICON[ocrStatus] ?? Clock;
  const statusColor = STATUS_COLOR[ocrStatus] ?? "text-muted";

  return (
    <Link
      href={`/records/${id}`}
      className={cn(
        "group flex min-h-[4rem] items-center gap-3 rounded-xl border border-border bg-surface p-4",
        "transition-[border-color,background-color,transform] duration-150",
        "hover:border-primary/30 hover:bg-bg",
        "active:scale-[0.97]",
      )}
    >
      {/* Type icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <TypeIcon className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-snug text-primary-ink">
          {title}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {memberName} · {typeLabel} · {displayDate}
        </p>
      </div>

      {/* Status: icon + label; label hidden on xs, always readable via sr-only + title */}
      <div
        className={cn("flex shrink-0 items-center gap-1", statusColor)}
        title={statusLabel}
      >
        <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden text-xs font-medium sm:inline">{statusLabel}</span>
        <span className="sr-only">{statusLabel}</span>
      </div>
    </Link>
  );
}
