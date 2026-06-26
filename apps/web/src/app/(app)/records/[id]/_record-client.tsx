"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t, type Locale } from "@sehatvault/i18n";

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
