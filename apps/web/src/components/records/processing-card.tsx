"use client";

import { Loader2, XCircle, Clock } from "lucide-react";
import { Card } from "@sehatvault/ui";
import { t, type Locale } from "@sehatvault/i18n";

type OcrStatus = "pending" | "processing" | "failed";

interface ProcessingCardProps {
  status: OcrStatus;
  locale: Locale;
}

export function ProcessingCard({ status, locale }: ProcessingCardProps) {
  if (status === "pending") {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Clock
          className="h-8 w-8 text-[var(--color-muted)]"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-[var(--color-ink)]">
          {t(locale, "records.processing.pending")}
        </p>
      </Card>
    );
  }

  if (status === "processing") {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <Loader2
          className="h-8 w-8 text-[var(--color-primary)] motion-safe:animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-[var(--color-ink)]">
          {t(locale, "records.processing.processing")}
        </p>
      </Card>
    );
  }

  // failed
  return (
    <Card className="flex items-center gap-3 border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 p-4">
      <XCircle
        className="h-5 w-5 shrink-0 text-[var(--color-danger)]"
        aria-hidden="true"
      />
      <p className="text-sm font-medium text-[var(--color-danger)]">
        {t(locale, "records.processing.failed")}
      </p>
    </Card>
  );
}
