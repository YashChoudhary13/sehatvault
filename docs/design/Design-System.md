# Design System — "Warm Trust"

> **Status:** Approved design (2026-06-20). One cohesive design system shared by every surface of `apps/web` — the marketing site, the product app, and the doctor-share view. Companion to [`UX-Plan.md`](./UX-Plan.md) (in-app screens) and `architecture/Engineering-Plan.md` (stack).
>
> **One line:** Apple/Google-grade polish — restrained, purposeful motion and generous whitespace — in a *warm, trustworthy* skin built for Indian families, fully accessible (WCAG AA, elder mode, `prefers-reduced-motion`).

---

## 1. Principles

1. **One system, two intensities.** Marketing uses the full design language (rich motion, large type, scroll-telling). The app uses a *calm subset* of the same tokens. They share one Tailwind preset and can never visually drift.
2. **Motion serves comprehension, never spectacle.** Apple-restraint: at most one focal "wow" per viewport. Every animation is `prefers-reduced-motion`- and elder-mode-safe, and **motion never blocks content** (the original document always shows instantly; AI layers in after).
3. **Warm, not clinical.** Teal = trust/health; a saffron accent adds family warmth and differentiates SehatVault from the sea of competitor clinical-blue (Eka, Driefcase, DigiLocker).
4. **Accessible by default.** AA contrast minimum, 44×44px touch targets, visible focus rings, Lucide SVG icons (never emoji), labels on all controls. Elder mode is a token swap, not a separate app.
5. **Trust cues are visual primitives.** Lock icons, "only you can see this," visible share expiry, access-logged footers are first-class styled components, not afterthoughts.

---

## 2. Where it lives (single source of truth)

Per `architecture/Engineering-Plan.md` (ADR-001: `apps/web` Next.js 15 PWA is the *only* client; ADR-016: Turborepo + pnpm):

| Location | Owns |
|---|---|
| `packages/config/tailwind-preset.ts` | All design tokens — color, typography scale, spacing, radius, shadow, motion timings/easings, z-index scale. **Every surface extends this preset.** |
| `packages/ui` | Shared primitives: shadcn/ui base components re-themed to tokens + a small `motion/` set (reduced-motion-aware Framer Motion wrappers). |
| `apps/web/src/app/(marketing)/` | Marketing routes — full-motion client islands built from 21st.dev blocks restyled to tokens. |
| `apps/web/src/app/(app)/` | Product app routes — calm-tier components from `UX-Plan.md` §8 inventory. |
| `apps/web/src/app/s/[token]/` | Public doctor-share view — read-only, token-styled, no app chrome. |

**Rule:** components import tokens from the preset; no surface hardcodes a hex value or a raw duration.

---

## 3. Design tokens — "Warm Trust"

### 3.1 Color

| Token | Hex | Use | Contrast notes |
|---|---|---|---|
| `primary` (teal) | `#0F766E` | brand, primary buttons, links | AA on `bg`/`surface` |
| `primary-ink` | `#134E4A` | brand text/headings accents | AAA on light |
| `accent` (saffron) | `#F59E0B` | highlights, CTA emphasis, "+ Add" energy | use on dark/ink, not as small text on light |
| `bg` | `#FAFAF7` (warm white) | page background | — |
| `surface` | `#FFFFFF` | cards, sheets | — |
| `ink` | `#1C1917` | body text | AA+ on `bg` |
| `muted` | `#57534E` | secondary text | ≥4.5:1 on `bg` |
| `border` | `#E7E5E4` | hairlines (used sparingly; prefer shadow) | — |
| `success` | `#059669` | "normal / up to date" status | pair with icon + label |
| `warn` | `#D97706` | "slightly high" status | pair with icon + label |
| `danger` | `#DC2626` | "high / needs review", destructive | pair with icon + label |

**Health status chips never rely on color alone** — always icon + word ("⚠ slightly high"), per `UX-Plan.md` §3.

**Anti-patterns (do not use):** neon/bright saturated fills, AI purple→pink gradients, motion-heavy carnival effects, color-only status. (Flagged for healthcare-trust products.)

### 3.2 Typography

- **Family:** Plus Jakarta Sans (headings + body), weights 400 / 500 / 600 / 700. Self-hosted via `next/font` for performance + privacy.
- **Body min 16px on mobile** (`readable-font-size`). Line-height 1.5–1.6 body; line-length capped 65–75ch on marketing prose.
- **Scale (base, app):** `xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 30 · 4xl 36`.
- **Marketing display:** up to `5xl–7xl` for hero headlines (clamp/responsive).
- **Elder mode:** multiply the type scale by **≥1.3×** and single-column (token-driven, same components).

### 3.3 Spacing, radius, shadow, z-index

- **Spacing:** 4-pt grid (`1=4px … 2=8 · 3=12 · 4=16 · 6=24 · 8=32 · 12=48 · 16=64`).
- **Radius:** `sm 8 · md 12 · lg 16 · xl 24` (cards `lg`, sheets `xl`, chips `full`).
- **Shadow:** soft layered elevation (`e1` subtle card, `e2` raised, `e3` sheet/modal). Prefer shadow over hard borders for depth.
- **Touch targets:** ≥44×44px (≥48px in elder mode).
- **Z-index scale:** `10` dropdown · `20` sticky nav · `30` sheet/drawer · `40` toast · `50` modal/dialog.

---

## 4. Motion system — two tiers, one config

**Approved level: Apple-restrained** (not immersive/3D, not minimal-only). The guiding instinct (Emil Kowalski): *unseen details compound* — every animation must justify itself, use a strong custom curve, and disappear gracefully under reduced motion.

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

| Surface | Source | Treatment |
|---|---|---|
| Marketing blocks (hero, feature, bento, testimonial, pricing) | **21st.dev** components | Restyled to Warm Trust tokens, wrapped in `motion/` primitives. Never shipped with default 21st.dev styling. |
| App screens | **shadcn/ui** + `UX-Plan.md` §8 inventory (MemberCard, CaptureSheet, RecordCard, ReviewCard, TrendChart, MedItem, ReminderItem, ShareScopeForm, QRCard, ConsentRow, AccessLogRow, EmptyState, ProcessingCard, LanguageToggle, ElderModeProvider, AppLockGate) | Re-themed to tokens, calm-tier motion. |
| Icons | **Lucide** | Consistent 24×24 viewBox; never emoji. |
| Charts | **Recharts** | Themed to palette; always with accessible table fallback + non-color encoding. |

**Component-feel rules (apply to every primitive):**
- **Pressables** (buttons, member cards, FAB, chips): `transform: scale(0.97)` on `:active`, `transition: transform 160ms var(--ease-out)`.
- **Popovers / dropdowns / member-switcher / share menu:** origin-aware — `transform-origin` set to the trigger (Radix/Base UI transform-origin CSS var), not `center`. **Modals stay centered** (no trigger anchor).
- **Tooltips:** delay before the first appears (prevents accidental activation); subsequent tooltips in the same group open instantly (skip delay + animation).
- **Hover states:** color/shadow/opacity only — never scale transforms that shift layout.

---

## 6. Marketing site structure

Route group `apps/web/src/app/(marketing)/`. RSC by default; motion lives in client islands only. SEO-first (metadata, semantic landmarks, fast LCP).

1. **Hero** — headline + subhead + saffron **"Get started free"** CTA + phone mockup (spring-in). One focal moment.
2. **Problem** — "records in plastic bags and drawers" narrative (scroll-reveal).
3. **How it works** — 3 steps: capture → auto-organise → share (staggered reveal).
4. **Feature bento** — timeline, trends, share-QR, reminders, AI Q&A.
5. **Trust & privacy** — DPDP, encryption, "only you can see this," consent/expiry/access-log cues.
6. **Family / NRI pricing** — freemium + premium family plan (NRI-priced).
7. **Vernacular + notifications** — en/hi; in-app + Telegram notifications (WhatsApp deferred).
8. **Footer** — links, language toggle, legal.

---

## 7. App re-skin & doctor-share

- **App:** same routes/components from `UX-Plan.md`, re-themed to Warm Trust tokens + calm-tier motion. Bottom-tab nav with elevated saffron **+ Add** FAB; member-context switcher chip.
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
- [ ] Tokens used (no hardcoded hex / raw durations).
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

- **Premium type upgrade (optional):** Satoshi/General Sans (Fontshare) instead of Plus Jakarta Sans for extra premium feel on marketing — deferred; Plus Jakarta Sans is the committed default.
- **Logo / wordmark:** not yet defined; will inform exact accent saturation and dark-section treatment.
- **Dark mode:** out of scope for MVP marketing; app uses light + elder themes first.
