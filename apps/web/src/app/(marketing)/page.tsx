import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Sparkles,
  Share2,
  FileText,
  TrendingUp,
  QrCode,
  Bell,
  MessageCircleQuestion,
  ShieldCheck,
  Lock,
  Eye,
  FileClock,
  DownloadCloud,
  Check,
} from "lucide-react";
import { t, type Locale } from "@sehatvault/i18n";
import { Section, GradientField, Card, HeroMedia, cn } from "@sehatvault/ui";
import { Reveal } from "@sehatvault/ui/motion";
import { getMarketingLocale } from "@/lib/marketing-locale";

export default async function MarketingPage() {
  const locale = await getMarketingLocale();
  return (
    <main>
      <Hero locale={locale} />
      <Problem locale={locale} />
      <HowItWorks locale={locale} />
      <Features locale={locale} />
      <Privacy locale={locale} />
      <Pricing locale={locale} />
      <FinalCta locale={locale} />
    </main>
  );
}

/* ── 1. Hero ──────────────────────────────────────────────────────────────── */
function Hero({ locale }: { locale: Locale }) {
  return (
    <Section className="overflow-hidden">
      <GradientField variant="hero" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {t(locale, "landing.hero.badge")}
            </span>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-primary-ink sm:text-5xl font-[family-name:var(--font-display)]">
              {t(locale, "landing.hero.headline")}
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              {t(locale, "landing.hero.description")}
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-[transform,filter] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {t(locale, "landing.hero.cta_primary")}
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-6 py-3.5 text-base font-semibold text-ink transition-colors hover:bg-bg"
              >
                {t(locale, "landing.hero.cta_secondary")}
              </Link>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-5 flex items-center gap-2 text-sm text-muted">
              <Lock className="h-4 w-4 text-primary" />
              {t(locale, "landing.hero.trust")}
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="flex justify-center lg:justify-end">
          <figure className="relative w-full max-w-[480px] overflow-hidden rounded-3xl border border-border bg-surface p-2 shadow-[0_24px_60px_-20px_color-mix(in_srgb,var(--color-primary)_30%,transparent)]">
            <HeroMedia
              poster="/hero/hero-poster.jpg"
              src="/hero/hero-loop.mp4"
              srcWebm="/hero/hero-loop.webm"
              alt={t(locale, "landing.hero.media_alt")}
              className="aspect-[3/2] w-full overflow-hidden rounded-2xl"
            />
          </figure>
        </Reveal>
      </div>
    </Section>
  );
}

/* ── 2. Problem ───────────────────────────────────────────────────────────── */
function Problem({ locale }: { locale: Locale }) {
  const pains = [
    t(locale, "landing.problem.pain_1"),
    t(locale, "landing.problem.pain_2"),
    t(locale, "landing.problem.pain_3"),
  ];
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 lg:py-20">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl font-[family-name:var(--font-display)]">
            {t(locale, "landing.problem.heading")}
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            {t(locale, "landing.problem.description")}
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          {pains.map((p, i) => (
            <Reveal key={i} delay={i * 80}>
              <Card className="h-full p-5 text-sm leading-relaxed text-ink">
                {p}
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 3. How it works ──────────────────────────────────────────────────────── */
function HowItWorks({ locale }: { locale: Locale }) {
  const steps = [
    {
      icon: Camera,
      title: t(locale, "landing.how.step_1.title"),
      body: t(locale, "landing.how.step_1.body"),
    },
    {
      icon: Sparkles,
      title: t(locale, "landing.how.step_2.title"),
      body: t(locale, "landing.how.step_2.body"),
    },
    {
      icon: Share2,
      title: t(locale, "landing.how.step_3.title"),
      body: t(locale, "landing.how.step_3.body"),
    },
  ];
  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t(locale, "landing.how.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl font-[family-name:var(--font-display)]">
              {t(locale, "landing.how.heading")}
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={i} delay={i * 100}>
              <Card elevation={2} className="relative h-full p-6">
                <span className="absolute right-5 top-5 text-sm font-bold text-border">
                  0{i + 1}
                </span>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-ink font-[family-name:var(--font-display)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── 4. Feature bento ─────────────────────────────────────────────────────── */
function Features({ locale }: { locale: Locale }) {
  return (
    <section id="features" className="scroll-mt-20 border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">
              {t(locale, "landing.features.eyebrow")}
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl font-[family-name:var(--font-display)]">
              {t(locale, "landing.features.heading")}
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid auto-rows-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Reveal className="sm:col-span-2 lg:row-span-2">
            <BentoCard
              large
              icon={FileText}
              title={t(locale, "landing.features.timeline.title")}
              body={t(locale, "landing.features.timeline.body")}
            />
          </Reveal>
          <Reveal delay={80}>
            <BentoCard
              icon={TrendingUp}
              title={t(locale, "landing.features.trends.title")}
              body={t(locale, "landing.features.trends.body")}
            />
          </Reveal>
          <Reveal delay={160}>
            <BentoCard
              icon={QrCode}
              title={t(locale, "landing.features.share.title")}
              body={t(locale, "landing.features.share.body")}
            />
          </Reveal>
          <Reveal delay={80}>
            <BentoCard
              icon={Bell}
              title={t(locale, "landing.features.reminders.title")}
              body={t(locale, "landing.features.reminders.body")}
            />
          </Reveal>
          <Reveal delay={160}>
            <BentoCard
              icon={MessageCircleQuestion}
              title={t(locale, "landing.features.ask.title")}
              body={t(locale, "landing.features.ask.body")}
              soon
              soonLabel={t(locale, "landing.features.coming_soon")}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  icon: Icon,
  title,
  body,
  large = false,
  soon = false,
  soonLabel,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  large?: boolean;
  soon?: boolean;
  soonLabel?: string;
}) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="flex items-center justify-between">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {soon && (
          <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-warn">
            {soonLabel}
          </span>
        )}
      </div>
      <h3
        className={cn(
          "mt-5 font-semibold text-ink font-[family-name:var(--font-display)]",
          large ? "text-xl" : "text-lg",
        )}
      >
        {title}
      </h3>
      <p
        className={`mt-2 leading-relaxed text-muted ${large ? "text-base" : "text-sm"}`}
      >
        {body}
      </p>
    </Card>
  );
}

/* ── 5. Trust & privacy ───────────────────────────────────────────────────── */
function Privacy({ locale }: { locale: Locale }) {
  const items = [
    {
      icon: Lock,
      title: t(locale, "landing.privacy.encrypted.title"),
      body: t(locale, "landing.privacy.encrypted.body"),
    },
    {
      icon: Eye,
      title: t(locale, "landing.privacy.only_you.title"),
      body: t(locale, "landing.privacy.only_you.body"),
    },
    {
      icon: FileClock,
      title: t(locale, "landing.privacy.expiry.title"),
      body: t(locale, "landing.privacy.expiry.body"),
    },
    {
      icon: DownloadCloud,
      title: t(locale, "landing.privacy.export.title"),
      body: t(locale, "landing.privacy.export.body"),
    },
  ];
  return (
    <section id="privacy" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {t(locale, "landing.privacy.badge")}
              </span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl font-[family-name:var(--font-display)]">
                {t(locale, "landing.privacy.heading")}
              </h2>
              <p className="mt-4 max-w-md text-lg text-muted">
                {t(locale, "landing.privacy.description")}
              </p>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={i} delay={i * 80}>
                <Card className="h-full p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-ink font-[family-name:var(--font-display)]">
                    {title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {body}
                  </p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── 6. Pricing ───────────────────────────────────────────────────────────── */
function Pricing({ locale }: { locale: Locale }) {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-border bg-surface">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:px-8 lg:py-24">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-ink sm:text-4xl font-[family-name:var(--font-display)]">
              {t(locale, "landing.pricing.heading")}
            </h2>
            <p className="mt-4 text-lg text-muted">
              {t(locale, "landing.pricing.description")}
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          <Reveal>
            <PriceCard
              name={t(locale, "landing.pricing.free.name")}
              price={t(locale, "landing.pricing.free.price")}
              cadence={t(locale, "landing.pricing.free.cadence")}
              tagline={t(locale, "landing.pricing.free.tagline")}
              features={[
                t(locale, "landing.pricing.free.feature_1"),
                t(locale, "landing.pricing.free.feature_2"),
                t(locale, "landing.pricing.free.feature_3"),
                t(locale, "landing.pricing.free.feature_4"),
                t(locale, "landing.pricing.free.feature_5"),
                t(locale, "landing.pricing.free.feature_6"),
              ]}
              cta={t(locale, "landing.pricing.free.cta")}
            />
          </Reveal>
          <Reveal delay={100}>
            <PriceCard
              highlighted
              name={t(locale, "landing.pricing.plus.name")}
              price={t(locale, "landing.pricing.plus.price")}
              tagline={t(locale, "landing.pricing.plus.tagline")}
              badge={t(locale, "landing.pricing.plus.badge")}
              features={[
                t(locale, "landing.pricing.plus.feature_1"),
                t(locale, "landing.pricing.plus.feature_2"),
                t(locale, "landing.pricing.plus.feature_3"),
                t(locale, "landing.pricing.plus.feature_4"),
                t(locale, "landing.pricing.plus.feature_5"),
              ]}
              cta={t(locale, "landing.pricing.plus.cta")}
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function PriceCard({
  name,
  price,
  cadence,
  tagline,
  features,
  cta,
  highlighted = false,
  badge,
}: {
  name: string;
  price: string;
  cadence?: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <Card
      elevation={highlighted ? 3 : 1}
      className={cn(
        "flex h-full flex-col p-7",
        highlighted && "border-[var(--color-primary)]",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-ink font-[family-name:var(--font-display)]">{name}</h3>
        {highlighted && badge && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
            {badge}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-primary-ink">{price}</span>
        {cadence && <span className="text-sm text-muted">{cadence}</span>}
      </div>
      <p className="mt-2 text-sm text-muted">{tagline}</p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary stroke-[2.5]" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/login"
        className={cn(
          "mt-6 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-[transform,filter,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100",
          highlighted
            ? "border border-primary bg-surface text-primary hover:bg-primary/5"
            : "bg-primary text-white hover:brightness-95",
        )}
      >
        {cta}
      </Link>
    </Card>
  );
}

/* ── 7. Final CTA ─────────────────────────────────────────────────────────── */
function FinalCta({ locale }: { locale: Locale }) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-accent/20 blur-2xl"
            />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl font-[family-name:var(--font-display)]">
              {t(locale, "landing.cta.heading")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
              {t(locale, "landing.cta.description")}
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-surface px-7 py-3.5 text-base font-semibold text-primary shadow-sm transition-[transform,filter] duration-150 ease-[var(--ease-out)] hover:brightness-95 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {t(locale, "landing.cta.button")}
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
