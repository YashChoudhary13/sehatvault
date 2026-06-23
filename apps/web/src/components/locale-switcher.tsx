"use client";

import { useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { updateUserLocale } from "@/lib/locale-actions";
import { cn } from "@/lib/utils";
import type { Locale } from "@sehatvault/i18n";

const LABELS: Record<Locale, string> = {
  en: "English",
  hi: "हिंदी",
};

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const [loading, setLoading] = useState(false);

  async function handleChange(next: Locale) {
    if (next === locale || loading) return;
    setLoading(true);
    await updateUserLocale(next);
    setLocale(next);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-primary-ink">Language</h2>
        <p className="text-sm text-muted">Choose your preferred language.</p>
      </div>
      <div className="flex gap-2">
        {(["en", "hi"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => handleChange(l)}
            disabled={loading}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              l === locale
                ? "border-primary bg-primary text-white"
                : "border-border bg-surface text-primary-ink hover:bg-bg",
            )}
          >
            {LABELS[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
