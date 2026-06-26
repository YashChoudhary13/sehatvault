# SehatVault — UI/Design Overhaul (Approved Design Spec)

> **Status:** APPROVED SPEC — 2026-06-26. Supersedes the direction doc `docs/design/Design-Overhaul.md` (which captured open questions; all now decided here).
> **Next step after this spec:** `superpowers:writing-plans` → implement surface-by-surface, each pixel-verified.
> **Sits on top of:** M1 Manual Vault (complete, branch `feat/m1-manual-vault`).

---

## 1. Goal

Move SehatVault from "clean but static, government-portal feel" to **premium, welcoming, alive, trustworthy** — the craft of Linear/Stripe/Whoop/Oura — while honoring the real constraints: mid-range Android, India data costs, elder mode, WCAG, privacy-calm tone. **Principle: premium and calm, not loud.** Every motion/asset has a graceful reduced-motion + low-bandwidth fallback and never delays content.

## 2. Locked decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Surface focus | **Both as one system** — a shared design language; landing + in-app are consumers |
| 2 | 3D | **None.** Rich 2D motion only (gradient/mesh depth + layered parallax + Framer Motion) |
| 3 | Video | **Short hero loop**; lazy (IntersectionObserver) + poster; reduced-motion/slow-conn → poster only |
| 4 | Higgsfield assets | **Hero imagery/loop + abstract motifs/textures** (product-shot loops + spot art deferred) |
| 5 | Functionality | Visual overhaul + **ONE folded-in win: richer `/home` dashboard** (existing data/endpoints only); broader feature wishlist stays a separate track |
| 6 | Build structure | **Approach A — foundation-first**: build the elevated system on a hidden `/design-preview`, then refactor landing + in-app onto it |
| 7 | Dark mode | **Token-ready, not built** — semantic token names, light-only ship, later flip with no rework |
| 8 | Palette | **Calm Indigo** (retires the "Warm Trust" name) |

## 3. Palette — "Calm Indigo"

Replaces the teal+amber-on-stone palette. Cool, premium, health-trustworthy. Light-only now; token names are semantic so a dark theme is a later flip. All pairings verified to **WCAG AA** (incl. elder high-contrast) before ship.

| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `#4F46E5` | indigo — primary actions, brand |
| `--color-primary-ink` | `#312E81` | deep indigo — pressed/headings on tint |
| `--color-accent` | `#14B8A6` | teal — sparing accent/highlight |
| `--color-bg` | `#FBFBFE` | app background |
| `--color-surface` | `#FFFFFF` | cards/sheets |
| `--color-tint` | `#EEF2FF` | lavender wash (section/tint surfaces) |
| `--color-ink` | `#0F1729` | near-black slate text |
| `--color-muted` | `#64748B` | cool-gray secondary text (was stone-brown) |
| `--color-border` | `#E5E7EB` | hairlines |
| `--color-success` | `#059669` | status (icon+label, never color-alone) |
| `--color-warn` | `#D97706` | status |
| `--color-danger` | `#E11D48` | status / danger variant |

> Exact tint/elevation/gradient sub-values finalized during foundation step; the lane above is fixed. Contrast re-checked on implementation.

## 4. Architecture (where the system lives)

```
packages/config/theme.css           extend: Calm Indigo palette, elevation ladder,
                                     gradient/mesh tokens, display font, motion tokens
                                     (dark-ready semantic names; light values only)
packages/ui/                         PROMOTED here (first real use of this workspace):
  motion/                            Framer primitives — wrap motion/react so tier +
                                     reduced-motion + elder logic lives in ONE place:
                                       <MotionTier>, <Reveal> (moved from landing),
                                       <PageTransition>, tier presets
  primitives/                        elevated shared components:
                                       Card, Button, Nav, EmptyState, Section shell,
                                       GradientField, HeroMedia, RecordCard (re-skin)
apps/web/app/(dev)/design-preview/   hidden showcase route; blocked in production
apps/web/public/brand/               Higgsfield assets (AVIF/WebP) + hero loop (webm/mp4) + poster
```

Rules:
- Dependencies point inward: `apps/web` → `packages/ui` → `packages/config`. Never reverse.
- `packages/core` stays framework-free (no React) — motion/UI live in `packages/ui`, not `core`.
- `<Reveal>` exists in landing today → move to `packages/ui/motion`; both surfaces consume the one copy.
- `design-preview` is dev-only — gate so it never reaches real users (env check / middleware block in prod).
- All motion flows through `packages/ui/motion` primitives — no raw `motion/react` calls scattered in screens.

## 5. Design-language tokens (Section foundation)

- **Elevation:** `--elev-0..4` ladder → soft layered shadows + subtle borders (not heavy). Cards/nav/sheets lift on this. Primary fix for the "flat" feel.
- **Gradient/mesh:** `--mesh-*`, `--glow-accent` tokens → the no-3D depth source; consumed by `GradientField` (hero + section backgrounds). Higgsfield textures layer on top.
- **Display font:** add a display face for headings; keep **Plus Jakarta Sans** for body. Candidate: **Bricolage Grotesque** (warm geometric) — confirm during foundation; self-host, `font-display: swap`, latin subset only for weight.
- **Type scale:** refined, larger/tighter display sizes; body unchanged for readability + elder mode.
- **Motion tokens:** `--motion-calm`, `--motion-standard`, `--motion-expressive` (duration + easing). No raw durations in components.
- **Radii:** keep current ladder (8/12/16/24); revisit only if it fights the new cards.

## 6. Motion system

Three tiers, selected by context; all auto-degrade under `prefers-reduced-motion` **and** elder mode to near-instant fades / no transforms.

| Tier | Surface | Behaviour |
|------|---------|-----------|
| **calm** | in-app (`/home`, `/records`, `/members`), route transitions | short fades, tiny rise, no large movement — daily-use + elder safe |
| **standard** | shared components, section reveals | `<Reveal>` scroll-in, hover/press micro-interactions, skeleton→content |
| **expressive** | landing hero only | parallax, staggered reveal, hero loop, "paper pile → calm timeline" transform |

Rules:
- Motion **never blocks content** — content renders first; motion enhances. Carry forward the existing `<Reveal>` ~1200ms safety-net so nothing is ever stuck at `opacity:0`.
- Page/route transitions = calm tier app-wide (Framer `AnimatePresence`).
- Motion is never the sole status signal (icon + label always).

## 7. Components to elevate

Into `packages/ui/primitives`, consumed by both surfaces:
- **Card** — elevation ladder + hover lift (standard tier) + optional gradient edge.
- **Nav** — MainNav (bottom-bar/side-rail) + landing nav: depth + active-state motion.
- **Button** — press micro-interaction; refined variants (keep `danger`).
- **EmptyState** — quiet-delight version (calm motion, illustrative-motif slot).
- **Section shell** + **GradientField** (mesh/glow bg) + **HeroMedia** (poster→lazy loop).
- **RecordCard** — re-skin onto new Card (component already exists from Sprint 6).

## 8. Richer `/home` dashboard (folded-in functional win)

Current `/home` = bare family/member list. New = a calm dashboard using **only existing data + endpoints — no new tables, no new RLS**:
- Greeting + family-switcher header.
- Quick-stats row — members, total records, recent-activity count (derived from existing queries).
- Recent-records strip — reuses `RecordCard`; links to `/records/[id]`.
- Quick-capture FAB — opens existing `CaptureSheet`, wired to existing `POST /api/ingest`.
- Real empty / loading (skeleton) / error states; calm-tier motion; elder-safe; copy via `t()` (en + hi).

**Scope guard:** anything needing new schema (trend charts, global search, doctor-share, refill prediction) is OUT — it belongs to the separate functionality track and gets its own brainstorm/spec.

## 9. Rollout sequence (Approach A)

1. **Foundation** — extend `theme.css` (palette + depth + gradient + display font + motion tokens) → build `packages/ui` motion + primitives → assemble `/design-preview`. Pixel-verify preview (desktop + 390px).
2. **Landing** — refactor onto primitives + Calm Indigo + hero (Higgsfield still/loop, `GradientField`, expressive motion). Wire copy through `t()` (closes existing landing-i18n debt). Pixel-verify.
3. **In-app** — re-skin shell/nav/cards/empty states onto primitives + calm motion; build richer `/home` dashboard. Pixel-verify `/home`, `/records`, `/members`.
4. **Sweep** — re-verify every existing screen against the new palette; fix stragglers (login, member/record forms, detail pages).

## 10. Asset pipeline (Higgsfield + video)

- Generate: hero still + abstract motifs/textures; one short hero loop.
- Optimize: stills/textures → **AVIF/WebP**; loop → **webm + mp4**; extract poster frame.
- Store: `apps/web/public/brand/`.
- `HeroMedia`: render poster (LCP element) → lazy-mount loop via IntersectionObserver → `prefers-reduced-motion` **or** slow connection (Network Information API hint) → poster only.

## 11. Performance budget (set before heavy assets)

- Landing **LCP < 2.5 s** on mid-tier mobile; **poster** is the LCP element, never the loop.
- Landing initial asset weight cap **≤ ~600 KB** (excludes lazy loop); hero loop **≤ ~1.5 MB**, never on the critical path.
- In-app: motion primitives code-split where practical; **no 3D libraries** in the bundle.
- Budget is a gate — if an asset breaks it, it is re-optimized or cut, not shipped.

## 12. Testing / Definition of Done (per surface)

Each surface is done only when:
1. `typecheck` + `build` + `test` green.
2. Calm Indigo **tokens** only — no hardcoded hex / raw durations.
3. **Lucide** icons; status = **icon + label** (never color alone).
4. Real **empty / loading (skeleton) / error** states.
5. **Responsive** 375 / 768 / 1024 / 1440 — no horizontal scroll.
6. Respects **`prefers-reduced-motion`** + **elder mode**; motion is correct tier; never blocks content.
7. Passes **Design-System §9 pre-delivery checklist** + the project Definition of Done (`docs/progress.md`).
8. Copy via **`t()`** (en + hi).
9. **agent-browser** pixel-verify (open → `screenshot --full` → `set viewport` for mobile → click critical actions).
10. Contrast re-checked **AA** on the new palette; reduced-motion honored.

## 13. Guardrails (non-negotiable)

- Every animation / video: reduced-motion + low-bandwidth fallback; never blocks content.
- Keep `main` deployable; `/design-preview` never ships to real users.
- Don't regress accessibility, elder mode, or the privacy-calm tone.
- No new schema/RLS in this overhaul (dashboard uses existing data only).
- RLS rules unchanged — this is presentation-layer work.

## 14. Docs to update on completion

- `packages/config/theme.css` — new tokens (the source of truth).
- `docs/design/Design-System.md` — rename Warm Trust → Calm Indigo; new tokens, motion tiers, elevation, components.
- `docs/design/Design-Overhaul.md` — mark superseded by this spec.
- `docs/progress.md` + `CLAUDE.md` — palette/brand rename; mark overhaul done per surface.
- `docs/Decisions.md` — ADR for the palette/brand change + the motion/asset direction.
