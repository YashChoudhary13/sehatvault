import { notFound } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  PenLine,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { t, type Locale } from "@sehatvault/i18n";
import { Button } from "@/components/ui/button";
import { RecordDetailClient } from "./_record-client";
import { DeleteRecordButton } from "@/components/delete-record-button";
import type { RecordRow } from "@/components/records/use-record-realtime";

type PageRecord = RecordRow & {
  member_profile: { display_name: string } | null;
};

const OCR_STATUS_ICON: Record<string, LucideIcon> = {
  pending: Clock,
  processing: Loader2,
  done: CheckCircle2,
  needs_review: AlertTriangle,
  failed: XCircle,
  manual: PenLine,
};

const OCR_STATUS_COLOR: Record<string, string> = {
  pending: "text-warn",
  processing: "text-primary",
  done: "text-success",
  needs_review: "text-warn",
  failed: "text-danger",
  manual: "text-muted",
};

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: appUser }, { data: record }] = await Promise.all([
    supabase.from("app_user").select("locale").eq("id", user.id).single(),
    supabase
      .from("health_record")
      .select(
        "id, title, type, ocr_status, record_date, file_object_key, created_at, member_id, summary, summary_hi, facility, doctor, member_profile(display_name)",
      )
      .eq("id", id)
      .single(),
  ]);

  if (!record) notFound();

  const locale: Locale = appUser?.locale === "hi" ? "hi" : "en";
  const rec = record as unknown as PageRecord;

  const title =
    rec.title ??
    rec.file_object_key?.split("/").pop() ??
    t(locale, "records.detail.untitled");

  const memberName = rec.member_profile?.display_name ?? "—";
  const typeLabel = t(locale, `records.type.${rec.type}`);
  const statusLabel = t(locale, `records.status.${rec.ocr_status}`);
  const StatusIcon = OCR_STATUS_ICON[rec.ocr_status] ?? Clock;
  const statusColor = OCR_STATUS_COLOR[rec.ocr_status] ?? "text-muted";
  const displayDate = rec.record_date
    ? new Date(rec.record_date).toLocaleDateString(
        locale === "hi" ? "hi-IN" : "en-IN",
        { year: "numeric", month: "short", day: "numeric" },
      )
    : "—";

  // Build the initial RecordRow passed to the client component (no member_profile).
  const initialRow: RecordRow = {
    id: rec.id,
    title: rec.title,
    type: rec.type,
    ocr_status: rec.ocr_status,
    record_date: rec.record_date,
    file_object_key: rec.file_object_key,
    created_at: rec.created_at,
    member_id: rec.member_id,
    summary: rec.summary,
    summary_hi: rec.summary_hi,
    facility: rec.facility,
    doctor: rec.doctor,
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs text-muted">{memberName}</p>
          <h1 className="text-2xl font-bold text-primary-ink">{title}</h1>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/records/${rec.id}/edit`}>
            {t(locale, "records.action.edit_record")}
          </Link>
        </Button>
      </div>

      {/* Meta row */}
      <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div>
          <span className="font-medium text-ink">
            {t(locale, "records.detail.type")}:{" "}
          </span>
          <span className="text-muted">{typeLabel}</span>
        </div>
        <div>
          <span className="font-medium text-ink">
            {t(locale, "records.detail.date")}:{" "}
          </span>
          <span className="text-muted">{displayDate}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-ink">
            {t(locale, "records.detail.status")}:
          </span>
          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor}`}>
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusLabel}
          </span>
        </div>
        <div>
          <span className="font-medium text-ink">
            {t(locale, "records.detail.member")}:{" "}
          </span>
          <span className="text-muted">{memberName}</span>
        </div>
      </div>

      {/* Live status-aware content — pending/processing/failed/done/needs_review */}
      <RecordDetailClient initial={initialRow} locale={locale} />

      {/* Danger Zone */}
      <div className="mt-10 rounded-xl border border-danger/30 bg-danger/5 p-5">
        <h2 className="mb-1 text-sm font-semibold text-danger">{t(locale, "records.danger_zone")}</h2>
        <p className="mb-4 text-xs text-muted">
          {t(locale, "records.action.delete_confirm_body")}
        </p>
        <DeleteRecordButton recordId={rec.id} />
      </div>
    </main>
  );
}
