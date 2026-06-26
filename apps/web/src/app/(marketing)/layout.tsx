import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { t } from "@sehatvault/i18n";
import { getMarketingLocale } from "@/lib/marketing-locale";
import { LocaleToggle } from "./_components/locale-toggle";

export const metadata: Metadata = {
  title: "SehatVault — Your family's health records, organised & private",
  description:
    "Snap a prescription or lab report and SehatVault reads it, organises it into each member's timeline, and keeps it private. Privacy-first, DPDP-compliant, made for Indian families.",
};

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="SehatVault home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
        <ShieldCheck className="h-5 w-5 stroke-[2.25]" />
      </span>
      <span className="text-lg font-bold tracking-tight text-primary-ink">
        SehatVault
      </span>
    </Link>
  );
}

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const locale = await getMarketingLocale();

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="flex items-center gap-2 sm:gap-3">
            <LocaleToggle locale={locale} />
            <span aria-hidden className="select-none text-border text-xs">·</span>
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t(locale, "landing.nav.signin")}
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-ink shadow-sm transition-[transform,filter] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {t(locale, "landing.nav.get_started")}
            </Link>
          </nav>
        </div>
      </header>

      {children}

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
            <div className="max-w-xs">
              <Wordmark />
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {t(locale, "landing.footer.tagline")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <FooterCol
                title={t(locale, "landing.footer.product")}
                links={[
                  [t(locale, "landing.footer.link.how_it_works"), "#how"],
                  [t(locale, "landing.footer.link.features"), "#features"],
                  [t(locale, "landing.footer.link.privacy"), "#privacy"],
                  [t(locale, "landing.footer.link.pricing"), "#pricing"],
                ]}
              />
              <FooterCol
                title={t(locale, "landing.footer.company")}
                links={[
                  [t(locale, "landing.footer.link.get_started"), "/login"],
                  [t(locale, "landing.footer.link.signin"), "/login"],
                ]}
              />
              <FooterCol
                title={t(locale, "landing.footer.legal")}
                links={[
                  [t(locale, "landing.footer.link.privacy_policy"), "#privacy"],
                  [t(locale, "landing.footer.link.terms"), "#privacy"],
                  [t(locale, "landing.footer.link.dpdp"), "#privacy"],
                ]}
              />
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {t(locale, "landing.footer.copyright")}</p>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <LocaleToggle locale={locale} />
              <span aria-hidden>·</span>
              <span>{t(locale, "landing.footer.disclaimer")}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: [string, string][];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link
              href={href}
              className="text-sm text-muted transition-colors hover:text-primary"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
