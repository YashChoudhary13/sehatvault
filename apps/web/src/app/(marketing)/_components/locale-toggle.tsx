"use client";

import { useTransition } from "react";
import { setMarketingLocale } from "@/lib/marketing-locale-action";
import type { Locale } from "@sehatvault/i18n";

export function LocaleToggle({ locale }: { locale: Locale }) {
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || isPending) return;
    startTransition(async () => {
      await setMarketingLocale(next);
    });
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <button
        type="button"
        lang="en"
        onClick={() => switchTo("en")}
        disabled={isPending}
        aria-current={locale === "en" ? ("true" as const) : undefined}
        className={`cursor-pointer transition-colors duration-150 disabled:opacity-50 ${
          locale === "en"
            ? "font-semibold text-primary"
            : "text-muted hover:text-ink"
        }`}
      >
        English
      </button>
      <span aria-hidden className="select-none text-border">·</span>
      <button
        type="button"
        lang="hi"
        onClick={() => switchTo("hi")}
        disabled={isPending}
        aria-current={locale === "hi" ? ("true" as const) : undefined}
        className={`cursor-pointer transition-colors duration-150 disabled:opacity-50 ${
          locale === "hi"
            ? "font-semibold text-primary"
            : "text-muted hover:text-ink"
        }`}
      >
        हिन्दी
      </button>
    </span>
  );
}
