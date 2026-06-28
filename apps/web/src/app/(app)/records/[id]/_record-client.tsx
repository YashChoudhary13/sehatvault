"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@sehatvault/i18n";
import { useRecordRealtime, type RecordRow } from "@/components/records/use-record-realtime";
import { ProcessingCard } from "@/components/records/processing-card";

// ── DocumentPreview ──────────────────────────────────────────────────────────

interface DocumentPreviewProps {
  recordId: string;
  locale: Locale;
}

export function DocumentPreview({ recordId, locale }: DocumentPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/records/${recordId}/file`)
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { url: string };
        if (!cancelled) setUrl(json.url);
      })
      .catch(() => {
        if (!cancelled) setError(t(locale, "records.detail.load_error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, locale]);

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center gap-2 text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">{t(locale, "records.detail.loading")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <FileText className="h-8 w-8 text-muted" />
        <p className="text-sm text-danger">{error}</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          {t(locale, "records.detail.retry")}
        </Button>
      </div>
    );
  }

  if (!url) return null;

  const isImage = /\.(jpe?g|png|webp|heic)(\?|$)/i.test(url);

  return (
    <div className="overflow-hidden rounded-lg shadow">
      <p className="bg-muted/30 px-4 py-2 text-sm font-medium text-ink">
        {t(locale, "records.detail.preview")}
      </p>
      {isImage ? (
        <img
          src={url}
          alt={t(locale, "records.detail.preview")}
          className="h-[600px] w-full bg-bg object-contain"
        />
      ) : (
        <iframe
          src={url}
          title={t(locale, "records.detail.preview")}
          className="h-[600px] w-full border-0"
          allow="fullscreen"
        />
      )}
    </div>
  );
}

// ── ReExtractButton ──────────────────────────────────────────────────────────

interface ReExtractButtonProps {
  recordId: string;
  ocrStatus: string;
  locale: Locale;
}

export function ReExtractButton({
  recordId,
  ocrStatus,
  locale,
}: ReExtractButtonProps) {
  const [busy, setBusy] = useState(false);
  const isProcessing = ocrStatus === "processing";

  async function handleClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/records/${recordId}/reextract`, {
        method: "POST",
      });
      if (!res.ok) {
        const json = (await res
          .json()
          .catch(() => ({}))) as { error?: { message?: string } };
        window.alert(json.error?.message ?? "Re-extraction failed");
      } else {
        window.alert(t(locale, "records.detail.re_extract_queued"));
      }
    } catch {
      window.alert(t(locale, "records.upload.error.network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="outline"
      disabled={isProcessing || busy}
      onClick={handleClick}
    >
      {isProcessing || busy
        ? t(locale, "records.detail.processing")
        : t(locale, "records.detail.re_extract")}
    </Button>
  );
}

// ── RecordDetailClient ───────────────────────────────────────────────────────
// Subscribes to live ocr_status updates and renders the appropriate content
// section: ProcessingCard (pending/processing), error card + retry (failed),
// or the document preview + AI summary (done / needs_review / manual).

interface RecordDetailClientProps {
  initial: RecordRow;
  locale: Locale;
}

export function RecordDetailClient({
  initial,
  locale,
}: RecordDetailClientProps) {
  const row = useRecordRealtime(initial.id, initial);
  const { ocr_status } = row;

  if (ocr_status === "pending" || ocr_status === "processing") {
    return (
      <div className="py-4">
        <ProcessingCard status={ocr_status} locale={locale} />
      </div>
    );
  }

  if (ocr_status === "failed") {
    return (
      <div className="space-y-4 py-4">
        <ProcessingCard status="failed" locale={locale} />
        <div className="flex justify-end">
          <ReExtractButton
            recordId={row.id}
            ocrStatus={row.ocr_status}
            locale={locale}
          />
        </div>
      </div>
    );
  }

  // done, needs_review, or manual — render document + optional AI summary
  return (
    <div className="space-y-6">
      {ocr_status === "needs_review" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-warn)]/30 bg-[var(--color-warn)]/10 p-4">
            <AlertTriangle
              className="h-5 w-5 shrink-0 text-[var(--color-warn)]"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-[var(--color-warn)]">
              {t(locale, "records.processing.needs_review")}
            </p>
          </div>
          <div className="flex justify-end">
            <ReExtractButton
              recordId={row.id}
              ocrStatus={row.ocr_status}
              locale={locale}
            />
          </div>
        </div>
      )}

      {row.file_object_key ? (
        <DocumentPreview recordId={row.id} locale={locale} />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--color-muted)]">
          <FileText className="mb-3 h-10 w-10" aria-hidden="true" />
          <p className="text-sm">{t(locale, "records.detail.no_document")}</p>
        </div>
      )}

      {row.summary && (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-tint)]/40 p-4">
          <h2 className="mb-2 text-sm font-semibold text-[var(--color-ink)]">
            {t(locale, "records.review.summary_label")}
          </h2>
          <p className="text-sm text-[var(--color-ink)]">
            {locale === "hi" && row.summary_hi ? row.summary_hi : row.summary}
          </p>
          <p className="mt-3 text-xs text-[var(--color-muted)]">
            {t(locale, "records.review.disclaimer_note")}
          </p>
        </div>
      )}
    </div>
  );
}
