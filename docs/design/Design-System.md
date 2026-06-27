# Design System — "Calm Indigo"

> **Status:** Updated 2026-06-27 (branch `feat/design-overhaul`). Supersedes the "Warm Trust" palette. One cohesive design system shared by every surface of `apps/web` — the marketing site, the product app, and the doctor-share view. Companion to [`UX-Plan.md`](./UX-Plan.md) (in-app screens) and `architecture/Engineering-Plan.md` (stack). See ADR-022.
>
> **One line:** Apple/Google-grade polish — restrained, purposeful motion and generous whitespace — in a *calm, indigo-trustworthy* skin built for Indian families, fully accessible (WCAG AA, elder mode, `prefers-reduced-motion`).

---

## 1. Principles

1. **One system, two intensities.** Marketing uses the full design language (rich motion, large type, scroll-telling). The app uses a *calm subset* of the same tokens. They share one Tailwind preset and can never visually drift.
2. **Motion serves comprehension, never spectacle.** Apple-restraint: at most one focal "wow" per viewport. Every animation is `prefers-reduced-motion`- and elder-mode-safe, and **motion never blocks content** (the original document always shows instantly; AI layers in after).
3. **Calm, not clinical.** Indigo = premium/trust; teal accent adds warmth and health resonance while differentiating SehatVault from the sea of competitor clinical-blue (Eka, Driefcase, DigiLocker). Premium and calm — never loud.
4. **Accessible by default.** AA contrast minimum, 44×44px touch targets, visible focus rings, Lucide SVG icons (never emoji), labels on all controls. Elder mode is a token swap, not a separate app.
5. **Trust cues are visual primitives.** Lock icons, "only you can see this," visible share expiry, access-logged footers are first-class styled components, not afterthoughts.

---

## 2. Where it lives (single source of truth)

Per `architecture/Engineering-Plan.md` (ADR-001: `apps/web` Next.js 15 PWA is the *only* client; ADR-016: Turborepo + pnpm):

| Location | Owns |
|---|---|
| `packages/config/theme.css` | All design tokens — Calm Indigo palette, elevation ladder, gradient tokens, motion tokens, typography scale, spacing, radius, shadow, z-index. **Every surface imports from here via CSS `@theme`.** |
| `packages/ui` (`@sehatvault/ui`) | **Canonical design-system primitives** — motion (`resolveMotion`, `useMotionTier`, `MotionTierBox`/`Reveal`, `PageTransition`) + components (`Card`, `Button`, `EmptyState`, `Section`, `GradientField`, `HeroMedia`, `cn`). Consumes only `@sehatvault/config`. `apps/web` transpiles it. |
| `apps/web/src/app/(marketing)/` | Marketing routes — full-motion client islands built on `@sehatvault/ui` primitives, Calm Indigo tokens. |
| `apps/web/src/app/(app)/` | Product app routes — calm-tier components from `UX-Plan.md` §8 inventory, re-skinned onto `@sehatvault/ui`. |
| `apps/web/src/app/s/[token]/` | Public doctor-share view — read-only, token-styled, no app chrome. |
| `apps/web/src/app/design-preview/` | Hidden showcase route (gated out of production via middleware); proves the elevated system before rollout. |

**Rule:** components import tokens from the preset; no surface hardcodes a hex value or a raw duration.

---

## 3. Design tokens — "Calm Indigo"

> Replaces the "Warm Trust" teal+amber-on-stone palette (retired as of ADR-022). Token names are semantic so a dark theme is a later flip — light values only now.

### 3.1 Color

| Token | Value | Role | Contrast notes |
|---|---|---|---|
| `--color-primary` | `#4F46E5` | indigo — brand, primary actions, buttons, links | AA on `bg`/`surface` |
| `--color-primary-ink` | `#312E81` | deep indigo — pressed state, headings on tint | AAA on light |
| `--color-accent` | `#14B8A6` | teal — **sparing** accent/highlight (not primary CTA) | AA on `bg`; use on dark/ink for small text |
| `--color-tint` | `#EEF2FF` | lavender wash — section/tint surfaces | — |
| `--color-bg` | `#FBFBFE` | app/page background | — |
| `--color-surface` | `#FFFFFF` | cards, sheets | — |
| `--color-ink` | `#0F1729` | near-black slate — body text | AA+ on `bg` |
| `--color-muted` | `#64748B` | cool-gray — secondary text | ≥4.5:1 on `bg` |
| `--color-border` | `#E5E7EB` | hairlines (used sparingly; prefer elevation shadow) | — |
| `--color-success` | `#059669` | "normal / up to date" status | pair with icon + label |
| `--color-warn` | `#D97706` | "slightly high" status | pair with icon + label |
| `--color-danger` | `#E11D48` | "high / needs review", destructive | pair with icon + label |

**Health status chips never rely on color alone** — always icon + word ("⚠ slightly high"), per `UX-Plan.md` §3.

**Anti-patterns (do not use):** teal as a primary action (it's an accent only), neon/bright saturated fills, AI purple→pink gradients, motion-heavy carnival effects, color-only status.

### 3.2 Elevation ladder

Four levels of depth, using `box-shadow` only (no hard borders for depth). Defined in `packages/config/theme.css` as `--elev-0..4`.

| Token | Shadow | Use |
|---|---|---|
| `--elev-0` | none | flat surfaces (bg, section backgrounds) |
| `--elev-1` | subtle | default card resting state |
| `--elev-2` | raised | hovered card, focused input |
| `--elev-3` | sheet | bottom sheet, side drawer |
| `--elev-4` | modal | dialog, command palette |

### 3.3 Gradient and glow tokens

| Token | Purpose |
|---|---|
| `--mesh-hero` | Hero-section background mesh gradient (landing only) |
| `--mesh-section` | Subtle section tint gradient (feature/trust sections) |
| `--glow-accent` | Indigo glow for focal elements (one per viewport; not on dailyuse paths) |

### 3.4 Motion tokens

| Token | Duration / easing | Tier |
|---|---|---|
| `--motion-calm` | 150ms `cubic-bezier(0.23,1,0.32,1)` | in-app dailyuse paths |
| `--motion-standard` | 250ms `cubic-bezier(0.23,1,0.32,1)` | modals, sheets, page transitions |
| `--motion-expressive` | 450ms spring (Framer Motion) | marketing hero, first-time moments |

All three tiers **degrade under `prefers-reduced-motion` AND elder mode** — movement is removed; opacity/color fades are kept where they aid comprehension.

### 3.5 Typography

- **Display family:** `--font-display` = Bricolage Grotesque (marketing headings, large hero text) via `next/font`.
- **Body family:** Plus Jakarta Sans (body + app UI), weights 400 / 500 / 600 / 700. Self-hosted via `next/font` for performance + privacy.
- **Body min 16px on mobile** (`readable-font-size`). Line-height 1.5–1.6 body; line-length capped 65–75ch on marketing prose.
- **Scale (base, app):** `xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36`.
- **Marketing display:** up to `5xl–7xl` for hero headlines (clamp/responsive).
- **Elder mode:** multiply the type scale by **≥1.3×** and single-column (token-driven, same components).

### 3.6 Spacing, radius, shadow, z-index

- **Spacing:** 4-pt grid (`1=4px … 2=8 · 3=12 · 4=16 · 6=24 · 8=32 · 12=48 · 16=64`).
- **Radius:** `sm 8 · md 12 · lg 16 · xl 24` (cards `lg`, sheets `xl`, chips `full`).
- **Shadow:** soft layered elevation (`e1` subtle card, `e2` raised, `e3` sheet/modal). Prefer shadow over hard borders for depth.
- **Touch targets:** ≥44×44px (≥48px in elder mode).
- **Z-index scale:** `10` dropdown · `20` sticky nav · `30` sheet/drawer · `40` toast · `50` modal/dialog.

---

## 4. Motion system — three tiers, one config

**Approved level: Apple-restrained** (no 3D; rich 2D motion only). The guiding instinct (Emil Kowalski): *unseen details compound* — every animation must justify itself, use a strong custom curve, and disappear gracefully under reduced motion.

**Three tiers** (keyed to context, `prefers-reduced-motion`, and elder mode):

| Tier | Token | Context |
|---|---|---|
| **Calm** | `--motion-calm` (150ms) | In-app daily-use paths (nav, record list, buttons) |
| **Standard** | `--motion-standard` (250ms) | Page transitions, modals, capture sheet, toasts |
| **Expressive** | `--motion-expressive` (450ms spring) | Marketing hero, first-time onboarding moments |

All tiers degrade under `prefers-reduced-motion` AND elder mode: movement is removed; opacity/color fades that aid comprehension are kept.

**`@sehatvault/ui` motion primitives** (canonical — do not reimplement inline):
- `resolveMotion(tier, reducedMotion, elderMode)` — returns safe props for Framer Motion
- `useMotionTier()` — React hook reading `prefers-reduced-motion` + `data-elder` attribute
- `MotionTierBox` (exported as `Reveal`) — scroll-reveal wrapper
- `PageTransition` — wraps authenticated app shell; calm tier

### 4.0 Should it animate at all? (frequency gate — answer first)

| Frequency | Decision | In SehatVault |
|---|---|---|
| 100+/day, keyboard-initiated | **No animation** | (no command palette at MVP) |
| Tens/day | Remove or minimal | **Bottom-tab switches: destination content does NOT animate in**; tab-indicator only. Hover effects minimal. |
| Occasional | Standard | Capture sheet, modals, toasts, record detail, share dialog. |
| Rare / first-time | Can delight | Onboarding, first-record "aha", processing-complete. |

### 4.1 Easing tokens (custom curves — CSS built-ins are too weak)

Defined once in `packages/config` and consumed everywhere. **Never use `ease-in` for UI** (delays the moment the user is watching → feels sluggish).

```
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1)     /* entering/exiting UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)    /* on-screen movement/morph */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)     /* iOS-like sheets/drawers */
/* color/hover → plain `ease`; constant motion (progress) → `linear` */
```

### 4.2 Durations & asymmetry

| Element | Duration |
|---|---|
| Button/press feedback | 100–160ms |
| Tooltip, small popover | 125–200ms |
| Dropdown, select, member-switcher | 150–250ms |
| Modal, drawer, capture sheet | 200–400ms |
| Marketing / explanatory | can be longer |

**Asymmetric:** exit is always faster than enter (system responds snappy); deliberate user actions (e.g., a future hold-to-confirm-delete) stay slow on press, snap back fast on release. UI motion stays **under 300ms**.

### 4.3 Marketing tier (full)
- **Reveal-on-scroll:** fade + rise 16px, `--ease-out`, `once`, threshold ~0.2. Predetermined → drive with **CSS/WAAPI (off main thread)** so it never drops frames during page load.
- **Spring focal point:** one per section, Apple notation `{ type: "spring", duration: 0.5, bounce: 0.2 }` (e.g., hero phone mockup settling). Bounce kept subtle (0.1–0.3).
- **Soft parallax:** hero only, ≤24px travel. No scroll-jacking, no pinned sequences.
- **Stagger:** children 40–60ms apart; decorative, never blocks interaction.
- **Budget:** at most one "wow" focal moment per viewport.

### 4.4 App tier (calm)
- Enter/exit 150–250ms `--ease-out`; sheets/drawers use `--ease-drawer`.
- **Never `scale(0)`** — entrances start `scale(0.95) + opacity:0` (nothing appears from nothing).
- Shared-layout transitions for card ↔ detail and capture-sheet open/close.
- Optimistic capture: record card transitions in immediately as `pending` (never a blocking spinner). Use **CSS transitions, not keyframes**, for rapidly-added items (toasts, processing cards) so they retarget smoothly instead of restarting.

### 4.5 Reduced-motion & elder mode (fewer & gentler — not zero)
- A single `packages/ui/motion` wrapper reads `useReducedMotion()` **OR** elder-mode context.
- **Keep** opacity/color fades that aid comprehension; **remove** movement, parallax, stagger, spring bounce.
- Hover-driven effects gated behind `@media (hover: hover) and (pointer: fine)` so a tap doesn't false-trigger hover.

### 4.6 Performance
- Animate **`transform`/`opacity` only** (skips layout/paint, GPU).
- Framer Motion `x`/`y`/`scale` shorthands are **not** hardware-accelerated — use the full `transform` string (or CSS) for anything predetermined or that runs during load.
- Reserve space for async content (no layout jump); skeletons over spinners; a faster spinner *feels* like a faster load.

---

## 5. Component strategy

**`@sehatvault/ui` is the canonical primitive layer.** All new components extend from it — do not reimplement `Card`, `Button`, `EmptyState`, `Section`, `GradientField`, `HeroMedia`, or motion wrappers inline in `apps/web`.

| Surface | Source | Treatment |
|---|---|---|
| Design-system primitives | **`@sehatvault/ui`** (`packages/ui`) | `Card`, `Button`, `EmptyState`, `Section`, `GradientField`, `HeroMedia`, `cn`; motion wrappers (`Reveal`, `PageTransition`, `MotionTierBox`). Calm Indigo tokens. |
| Marketing blocks (hero, feature, bento, trust, pricing) | **`@sehatvault/ui`** primitives + landing-specific client islands | Expressive/standard tier motion. Primary CTAs are indigo; teal reserved for accents only. |
| App screens | **`@sehatvault/ui`** + **shadcn/ui** + `UX-Plan.md` §8 inventory (MemberCard, CaptureSheet, RecordCard, ReviewCard, TrendChart, MedItem, ReminderItem, ShareScopeForm, QRCard, ConsentRow, AccessLogRow, EmptyState, ProcessingCard, LanguageToggle, ElderModeProvider, AppLockGate) | Calm-tier motion. Re-skinned onto Calm Indigo tokens. |
| Icons | **Lucide** | Consistent 24×24 viewBox; never emoji. |
| Charts | **Recharts** | Themed to Calm Indigo palette; always with accessible table fallback + non-color encoding. |

**Component-feel rules (apply to every primitive):**
- **Pressables** (buttons, member cards, FAB, chips): `transform: scale(0.97)` on `:active`, `transition: transform 160ms var(--ease-out)`.
- **Popovers / dropdowns / member-switcher / share menu:** origin-aware — `transform-origin` set to the trigger (Radix/Base UI transform-origin CSS var), not `center`. **Modals stay centered** (no trigger anchor).
- **Tooltips:** delay before the first appears (prevents accidental activation); subsequent tooltips in the same group open instantly (skip delay + animation).
- **Hover states:** color/shadow/opacity only — never scale transforms that shift layout.

---

## 6. Marketing site structure

Route group `apps/web/src/app/(marketing)/`. RSC by default; motion lives in client islands only. SEO-first (metadata, semantic landmarks, fast LCP).

1. **Hero** — headline + subhead + indigo **"Get started free"** CTA + phone/device mockup (CSS or future `HeroMedia` video/poster). One focal moment.
2. **Problem** — "records in plastic bags and drawers" narrative (scroll-reveal).
3. **How it works** — 3 steps: capture → auto-organise → share (staggered reveal).
4. **Feature bento** — timeline, trends, share-QR, reminders, AI Q&A.
5. **Trust & privacy** — DPDP, encryption, "only you can see this," consent/expiry/access-log cues.
6. **Family / NRI pricing** — freemium + premium family plan (NRI-priced).
7. **Vernacular + notifications** — en/hi; in-app + Telegram notifications (WhatsApp deferred).
8. **Footer** — links, language toggle, legal.

---

## 7. App re-skin & doctor-share

- **App:** same routes/components from `UX-Plan.md`, re-skinned onto `@sehatvault/ui` primitives + Calm Indigo tokens + calm-tier motion. App shell wrapped in `PageTransition`; `MainNav` has depth + calm active transitions; `RecordCard` and `EmptyState` consume `@sehatvault/ui` `Card`/`EmptyState`.
- **Elder mode (ADR-015):** token swap — ≥1.3× type, AA+ contrast, single column, ≥48px targets, icon+label, reduced motion. Same codebase.
- **Doctor share (`/s/:token`, public):** clean read-only — member name/age/blood group, allergies banner, key trends, meds, record list with view buttons, footer "Shared securely via SehatVault · expires <when> · access logged." No app chrome, no nav, no motion beyond simple fades.

---

## 8. Accessibility & i18n integration

- WCAG AA across surfaces: 4.5:1 text contrast, visible 3–4px focus rings, keyboard nav matching visual order, labels/`aria-label` on all controls, skip links on marketing.
- All copy through `t()` (en + hi at launch); numerals/units locale- and medically-correct.
- One-handed reachability: primary actions in the thumb zone / bottom sheets (per `UX-Plan.md` §7).
- Color never the sole indicator (status = icon + label + color).

---

## 9. Pre-delivery checklist (every UI PR)

- [ ] No emoji as icons (Lucide SVG only).
- [ ] Calm Indigo tokens used (no hardcoded hex / raw durations); primitives from `@sehatvault/ui` where applicable.
- [ ] `cursor-pointer` + visible hover feedback on all interactive elements.
- [ ] Transitions 150–300ms; `transform`/`opacity` only.
- [ ] Light-mode text contrast ≥4.5:1; borders/glass visible.
- [ ] Focus states visible for keyboard nav.
- [ ] `prefers-reduced-motion` **and** elder mode respected (gentle fades kept, movement removed).
- [ ] Responsive at 375 / 768 / 1024 / 1440px; no horizontal scroll on mobile.
- [ ] Status/data not conveyed by color alone.
- [ ] Async content reserves space (no layout jump); skeletons over spinners.
- [ ] Custom easing tokens used (no weak built-in `ease-in`/`ease-out`); `ease-in` never on UI.
- [ ] Pressables have `:active` scale(0.97); no entrance from `scale(0)`.
- [ ] Popovers origin-aware (modals exempt); hover effects gated behind `(hover:hover)`.
- [ ] No high-frequency action animates (bottom-tab content does not animate in).
- [ ] Exit faster than enter; rapidly-added items use CSS transitions, not keyframes.

---

## 10. Open decisions

- **Premium type upgrade (optional):** Satoshi/General Sans (Fontshare) instead of Plus Jakarta Sans for extra premium feel on marketing — deferred; Plus Jakarta Sans is the committed default. Bricolage Grotesque (`--font-display`) is now committed for display headings.
- **Logo / wordmark:** not yet defined; will inform exact accent saturation and dark-section treatment.
- **Dark mode:** token-ready (semantic CSS variable names, light values only) — not built. Flip later by overriding values in `theme.css` without touching component code. (ADR-022)
- **Hero video/poster (`HeroMedia`):** component exists; Higgsfield assets deferred. Wire when assets are ready; add elder-mode check in `HeroMedia` at wire-time (recorded finding in `.superpowers/sdd/progress.md`).
