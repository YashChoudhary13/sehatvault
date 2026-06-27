# SehatVault — Progress Tracker

> **Related docs:** [Planning](planning/Planning.md) · [Decisions](Decisions.md) · [Engineering-Plan](architecture/Engineering-Plan.md) · [DOCUMENTATION](DOCUMENTATION.md)

> **Last updated:** 2026-06-27
> **Current milestone:** M1 — Manual Vault (**COMPLETE & pixel-verified** 2026-06-26) + **Calm Indigo design overhaul COMPLETE** (branch `feat/design-overhaul`, 2026-06-27)
> **Active branches:** `feat/m1-manual-vault` (7 slices; ready for PR → `main`) · `feat/design-overhaul` (design overhaul; built on top of M1)
>
> **▶ RESUME HERE (next session):** **M1 + Calm Indigo design overhaul are MERGED into `main` (2026-06-27).** Design overhaul squash-merged via PR #3 (`283a2d6`); M1 was already merged via PR #2 (`b24f56a`). **`main` CI is now fully green** (build ✓ · db ✓) — it had been red for 3+ runs on pre-existing infra bugs, all fixed during the merge: (a) `pnpm-lock.yaml` synced with `packages/ui` deps; (b) 20 lint errors (`sw.js` `/* global */` decl, dead test code in `record.test.ts`, stray Next img-disable in `hero-media.tsx`); (c) migration `0005` trigger rename made idempotent (existence-guarded; no-op on prod, replays clean in CI); (d) CI web-build step given placeholder `NEXT_PUBLIC_SUPABASE_*` so `/login` prerender works. **Still DEFERRED (user-owned):** hero loop video (Task 9) — wire `<HeroMedia>` into the marketing hero when the Veo loop lands (component exists; apply recorded elder-mode fix). Merged local branches `feat/design-overhaul` + `feat/m1-manual-vault` (and remote `feat/design-overhaul`) can be deleted. **⭐ NEXT TASK = Sprint 7 — AI Pipeline (M2):** `services/ai/` FastAPI worker draining pgmq + Render deploy; `/api/ai/callback` (HMAC-verified); realtime record status. #1 delivery risk (Dev Rule 5) — START WITH `superpowers:brainstorming` to lock open decisions (extraction LLM/model, callback HMAC design, worker deploy, T1 eval-set sourcing ~50 de-identified docs) → spec → `writing-plans` → build. Read order: `../CLAUDE.md` → this file → `planning/Planning.md` (Sprint 7, row 7) → `architecture/Engineering-Plan.md` → `api/API-Spec.md` (callback) → `database/Schema.md`.

---

## ⭐ Working Principle — Design-as-you-build (Definition of Done)

> Added 2026-06-26. **We build like professional developers: each feature is _designed_ as part of building it — not shipped functional-but-ugly with a deferred "polish later" pass** (that pass never comes, and the product feels unfinished — exactly what happened before the marketing landing forced the issue).

**Before building any user-facing screen/component**, read its spec:
- `docs/design/UX-Plan.md` — screen flows + §8 component inventory (MemberCard, CaptureSheet, RecordCard, TrendChart, ReviewCard, ShareScopeForm, QRCard, EmptyState, ProcessingCard, …).
- `docs/design/Design-System.md` — Calm Indigo tokens, motion tiers, `@sehatvault/ui` primitives, component-feel rules.

**A feature is _done_ only when it meets this Definition of Done:**
1. Uses **Calm Indigo tokens** (`packages/config/theme.css`) + **`@sehatvault/ui`** primitives — no hardcoded hex or raw durations.
2. **Lucide** icons only (never emoji); status = **icon + label** (never colour alone).
3. Has real **empty / loading / error** states (skeletons over spinners; reserve space, no layout jump).
4. **Responsive** at 375 / 768 / 1024 / 1440 — no horizontal scroll on mobile.
5. Respects **`prefers-reduced-motion`** and **elder mode**; motion is calm-tier and never blocks content.
6. Passes the **`Design-System.md` §9 pre-delivery checklist** (the canonical gate).
7. **Pixels verified** via `agent-browser` (open → `screenshot --full` → `set viewport <w> <h>` for mobile → click the critical actions) — *not just* typecheck/build green.
8. Copy goes through **`t()`** (en + hi). *(Known debt: marketing landing is still inline English — scheduled follow-up.)*

Every sprint below now carries an explicit **Design** step + this DoD.

> **How to run the RLS gate locally:** `DATABASE_URL=postgres://…@host/db ./supabase/tests/run-rls-tests.sh` against a **disposable** Postgres (the script applies `00_bootstrap_auth.sql` → migrations → `rls_isolation.test.sql`). CI runs the same sequence in the `db` job on every push/PR.

---

## Completed Tasks

### M0 — Foundations & Guardrails (PR1, merged 2026-06-21)

| Task | Status | Notes |
|------|--------|-------|
| Turborepo + pnpm 9 monorepo init | ✅ | Root `package.json`, `pnpm-workspace.yaml`, `turbo.json` |
| `.nvmrc` = 22, `.npmrc`, `.gitignore` | ✅ | Node 22 LTS enforced via corepack |
| `packages/config` — tsconfig.base, ESLint 9 flat, Prettier, `theme.css` | ✅ | Warm Trust design tokens in CSS `@theme` variables |
| `packages/core` — `appVersion()` + `isNonEmptyName()` + Vitest test | ✅ | TDD: test-first; Vitest green |
| `packages/i18n` — en/hi message catalogs + `t()` helper | ✅ | Keys: `app.name`, `app.tagline`, `nav.*` |
| `apps/web` — Next.js 15 + Tailwind v4 + Plus Jakarta Sans font | ✅ | PWA-ready scaffold |
| `apps/web` — shadcn/ui Button (CVA + Radix Slot) + `cn()` | ✅ | `components.json` for Tailwind v4 |
| `apps/web` — Sentry init stub | ✅ | PHI scrubbing configured |
| `apps/web` — Supabase client factories (server + browser) | ✅ | Cookie SSR client + anon browser client |
| `apps/web` — zod env validation (`lib/env.ts`) | ✅ | Server-only keys never exported to browser |
| `supabase/config.toml` | ✅ | `ap-south-1` region |
| `supabase/migrations/0001_init.sql` | ✅ | pgcrypto + `set_updated_at()` trigger; no PHI tables yet |
| `supabase/seed/seed.sql` | ✅ | Empty placeholder |
| `.github/workflows/ci.yml` | ✅ | lint + typecheck + unit tests + build + ephemeral Postgres migration check |
| `.env.example` | ✅ | All key names; values blank |
| `docs/Dev-Setup.md` | ✅ | Prerequisites, bootstrap, Docker/Supabase-cloud caveat, admin checklist |
| Supabase security linter fix (search_path pin on `set_updated_at`) | ✅ | Follow-up commit `3be74aa` |

---

### Sprint 2 — Auth + First RLS (completed 2026-06-23)

| Task | Status | Epic ref | Notes |
|------|--------|----------|-------|
| Migration `0002_family.sql` — `app_user`, `family`, `member_profile` + `auth_family_ids()` | ✅ | E1.S1.2.T6 | Applied to prod; history `0001`/`0002` sequential |
| RLS policies for all three tables + `family` | ✅ | E1.S1.2.T6 | 4 policies each; default-deny |
| Email-OTP login screen (`app/(auth)/login/`) | ✅ | E1.S1.2.T5 | Supabase Auth Email OTP (ADR-019); send-code → verify |
| `middleware.ts` — session refresh + route protection | ✅ | E1.S1.2.T5 | Protects all routes except `/login` |
| RLS isolation test suite added to CI | ✅ | E1.S1.2.T7 | `supabase/tests/`; CI `db` job; green isolated, red on injected leak |
| `app_lock_hash` positive/negative RLS assertions | ✅ | E1.S1.2.T7 | B can set own PIN hash; cannot overwrite A's |
| App-lock PIN (argon2; server-verify) | ✅ | E1.S1.2.T8 | `@node-rs/argon2`; rate-limited verify; hash never to browser; PIN setup + lock screen in `(app)` shell |
| PIN domain logic + Vitest (`packages/core/src/pin.ts`) | ✅ | E1.S1.2.T8 | Length 4–6, digits-only, trivial-PIN blocklist |
| i18n locale switching (wire from `app_user.locale`) | ✅ | E1.S1.2.T8 | `LocaleProvider` + `useT()` hook; `updateUserLocale` Server Action; `LocaleSwitcher` in Settings |
| `0003_harden_function_grants.sql` | ✅ committed + CI-gated | — | Pending `supabase db push` to prod (low priority, no blocker) |
| ~~Admin: DLT / WhatsApp / Razorpay KYC~~ → deferred | ➖ | E1.S1.2.T9 | Not MVP blockers (ADR-019/020) |

**M0 exit gate — all items verified:**
- ✅ Email OTP sign-in flow implemented
- ✅ Automated RLS test: family-B cannot read or write family-A's rows across all three tables (`rls_isolation.test.sql`, CI `db` job)
- ✅ `app_lock_hash` positive/negative control added to RLS harness

---

### Sprint 3 — App Shell & Members (completed 2026-06-23)

| Task | Status | Notes |
|------|--------|-------|
| `AppShell` client component + `AppLock` inner component | ✅ | `(app)/layout.tsx` wraps children; `LocaleProvider → AppLock → (MainNav + content)` |
| `MainNav` — mobile bottom tab bar + desktop side rail | ✅ | Fixed bottom on `< md`, fixed side rail on `>= md`; iOS safe-area insets via `env(safe-area-inset-bottom)` |
| `EmptyState` reusable component | ✅ | `{ icon, title, description, actionButton? }` props; Warm Trust tokens |
| Home / family view (`app/(app)/page.tsx`) | ✅ | Server Component; parallel-fetches `app_user.locale` + `family + member_profile`; EmptyState or member list |
| Root layout `viewport: { viewportFit: "cover" }` | ✅ | iOS safe-area support |
| `InsertMemberSchema` + `InsertMemberData` (`packages/core`) | ✅ | Zod schema; error messages are i18n keys |
| `createMember` Server Action | ✅ | Validates → fetches family RLS-scoped → inserts with `family_id`; no PHI logged |
| `updateMember` Server Action | ✅ | RLS UPDATE policy enforces ownership; `revalidatePath` + `redirect` |
| `deleteMember` Server Action | ✅ | RLS DELETE policy enforces ownership; `revalidatePath` + `redirect` |
| Shared `MemberForm` client component | ✅ | `initialData?: MemberFormInitialData`; joins arrays to comma-strings; `onSubmit` callback |
| `DeleteMemberButton` client component | ✅ | shadcn `AlertDialog` confirm; `useTransition` for pending state; `danger` variant |
| Member Create page (`/members/new`) | ✅ | Thin shell → `<MemberForm onSubmit={createMember} cancelHref="/" />` |
| Member Profile page (`/members/[id]`) | ✅ | Server Component; parallel-fetch; Basic/Medical/Emergency/Danger Zone sections |
| Member Edit page (`/members/[id]/edit`) | ✅ | Server Component; `updateMember.bind(null, id)` passed as onSubmit prop |
| i18n `members.form.*` keys (27 keys, en + hi) | ✅ | Labels, placeholders, sex options, error keys, save/cancel/saving |
| i18n `members.profile.*` keys (17 keys, en + hi) | ✅ | Section headers, field labels, confirm-delete strings |
| `danger` button variant | ✅ | `bg-danger text-white hover:bg-danger/90` in Warm Trust tokens |
| shadcn `alert-dialog`, `form`, `input`, `select`, `label` | ✅ | Added to `apps/web/src/components/ui/` |
| `pnpm --filter web build` green | ✅ | 7 routes; zero type errors |

---

---

### Sprint 4 — Capture & Storage (completed 2026-06-25)

| Task | Status | Notes |
|------|--------|-------|
| `supabase/migrations/0004_health_records.sql` | ✅ | `health_record` table + 3 enums + pgmq guard + 4 RLS policies + storage bucket + 3 storage policies |
| `supabase/migrations/0005_fix_trigger_policy_names.sql` | ✅ | Trigger rename + storage policy DROP/CREATE (ALTER POLICY RENAME blocked on Cloud) |
| Migrations 0001–0005 applied to prod | ✅ | Confirmed via `supabase migration list` |
| `CaptureSheet` client component | ✅ | Camera / Gallery / PDF; `onFile` callback; no locale dep |
| `UploadSection` client component | ✅ | Dialog wrapper; member select; progress feedback; `t(locale, "records.upload.*")` |
| `POST /api/ingest` route | ✅ | Auth → validate MIME + size → storage upload → `health_record(pending)` insert |
| `GET /api/records/[id]/file` route | ✅ | Auth → RLS fetch → 60 s signed URL → `{ url, expires_at }` |
| `_record-client.tsx` (`DocumentPreview` + `ReExtractButton`) | ✅ | `"use client"`; iframe/img; spinner; retry |
| `/records/[id]` detail page | ✅ | Server Component; header + meta row + doc preview + Danger Zone |
| Records list → clickable items + Create Record button | ✅ | `<Link>` wraps each row; New Record button added |
| i18n `records.upload.*` (12 keys, en + hi) | ✅ | |
| i18n `records.detail.*` (13 keys, en + hi) | ✅ | |
| Storage bucket: private, 50 MiB, correct MIME types | ✅ | Confirmed via Supabase MCP |
| `health_record` RLS + triggers on prod | ✅ | 4 policies + 2 triggers confirmed |
| Unauth → all new routes → 307 /login | ✅ | curl confirmed |
| E2E browser flow | ❌ | Chrome unavailable on dev machine — manual test by developer required |

---

### Sprint 5 — Record Detail & Manual Entry (completed 2026-06-26)

| Task | Status | Notes |
|------|--------|-------|
| `InsertRecordSchema` + `InsertRecordData` in `packages/core` | ✅ | zod; `title` required (min 1); `facility`/`doctor`/`summary` optional |
| `createRecord` Server Action | ✅ | zod validate → insert `source=manual, ocr_status=manual` → redirect |
| `deleteRecord` Server Action | ✅ | RLS fetch → best-effort storage removal → delete row → redirect |
| `RecordForm` client component | ✅ | Controlled; `initialData?`/`onSubmit?`/`readOnlyMember?` for edit reuse |
| `/records/new` page | ✅ | Server Component; fetches locale + members; empty-member guard |
| `DeleteRecordButton` client component | ✅ | AlertDialog; `useT()` hook; danger variant |
| Detail page: Delete + Edit link wired | ✅ | Danger Zone section; Edit button → `/records/[id]/edit` |
| i18n `records.action.*` (17 keys, en + hi) | ✅ | |
| `/records/[id]/edit` page | ✅ | `app/(app)/records/[id]/edit/page.tsx`; pre-fills `RecordForm` via `initialData` (⚠️ not yet pixel-verified end-to-end) |
| `updateRecord` Server Action | ✅ | `app/actions/record-edit.ts` |
| Audit log on delete | ❌ | `audit_log` table not in schema yet — deferred to M4 (DPDP) |

---

### Marketing Landing & Routing (completed 2026-06-26)

> Built to `docs/design/Design-System.md` §6. This was the missing "professional first impression" — the approved Warm Trust marketing site had never been implemented; only the authenticated app existed, so `/` redirected straight to a bare login.

| Task | Status | Notes |
|------|--------|-------|
| Public marketing landing at `/` | ✅ | `app/(marketing)/{layout,page}.tsx` — 7 sections: hero (CSS device mockup), problem, how-it-works, feature bento, privacy, pricing, final CTA |
| `Reveal` scroll-reveal component | ✅ | `_components/reveal.tsx`; IntersectionObserver fade+rise, reduced-motion safe, **1200ms fallback** so content never stays `opacity:0` |
| Dashboard moved `/` → `/home` | ✅ | `(app)/home/page.tsx`; old `(app)/page.tsx` deleted (route-group conflict) |
| Routing updates | ✅ | `middleware.ts` (`/` public; login → `/home`), `login/page.tsx`, `member.ts` redirects, `main-nav.tsx` home href + `isActive` |
| Pixel verification (desktop + mobile) | ✅ | agent-browser; full-page + 390px viewport; all sections render, no overflow |
| Design DoD compliance | ✅ | Warm Trust tokens, Lucide icons, icon+label status, responsive, reduced-motion |
| Landing i18n (`t()`, en + hi) | ❌ | Copy is inline English; no marketing language toggle — **scheduled follow-up** |

---

### Design Overhaul — Calm Indigo (completed 2026-06-27, branch `feat/design-overhaul`)

> Built per approved spec `docs/superpowers/specs/2026-06-26-design-overhaul-design.md` and executed plan `docs/superpowers/plans/2026-06-26-design-overhaul.md` (Tasks 1–13; Task 9 deferred). Full ledger: `.superpowers/sdd/progress.md`.

| Task | Status | Notes |
|------|--------|-------|
| **Foundation: Calm Indigo palette** (`packages/config/theme.css`) | ✅ | Replaces Warm Trust; primary `#4F46E5` indigo, accent `#14B8A6` teal; elevation `--elev-0..4`; gradient tokens `--mesh-hero/section/--glow-accent`; motion tokens `--motion-calm/standard/expressive`; `--font-display` (Bricolage Grotesque) |
| **`packages/ui` (`@sehatvault/ui`) populated** | ✅ | Motion primitives: `resolveMotion`, `useMotionTier`, `MotionTierBox`/`Reveal`, `PageTransition`. Component primitives: `Card`, `Button`, `EmptyState`, `Section`, `GradientField`, `HeroMedia`, `cn`. Consumes only `@sehatvault/config`. |
| 3 motion tiers (calm/standard/expressive) + reduced-motion/elder degradation | ✅ | All tiers degrade under `prefers-reduced-motion` AND `data-elder`; `useMotionTier` does not react to runtime elder toggle (no MutationObserver) — defer to M3 `ElderModeProvider` |
| Hidden `/design-preview` showcase route | ✅ | Gated out of production via middleware |
| **Landing refactored** onto `@sehatvault/ui` + Calm Indigo | ✅ | Primary CTAs are indigo; teal reserved for accents; `--font-display` Bricolage Grotesque on hero; **live pixel-verified** desktop + 390px mobile |
| App shell wrapped in calm `PageTransition` | ✅ | |
| `MainNav` re-skinned: depth + calm active transitions | ✅ | Responsive + safe-area preserved |
| `RecordCard` re-skinned onto `ui Card` | ✅ | |
| Shared `EmptyState` adopted from `@sehatvault/ui` | ✅ | |
| **Richer `/home` dashboard** | ✅ | Greeting + `summarizeDashboard` stats row (members/records/recent-7-days, via `packages/core`) + recent-records strip (`RecordCard`) + `UploadSection`; existing data/endpoints only — no new tables or RLS |
| Hardcoded colour sweep (Task 13) | ✅ | 0 stragglers; only required PWA literal hexes remain (already Calm Indigo) |
| **Task 9 — Hero video/poster** | ❌ DEFERRED (user-owned) | User will generate the loop in Veo and wire `HeroMedia` later; CSS device mockup retained as the hero focal point — no dangling video refs. Apply recorded elder-mode fix at wire-time. |
| Authed in-app live pixel-verify (desktop + 390px) | ✅ | 2026-06-27 via agent-browser + "Continue as Demo" (dev login): `/home`, `/records` desktop; landing + mobile (390px) confirmed. Calm Indigo, elevated cards, month-grouped timeline, icon+label status, no horizontal scroll. Full suite green: typecheck (5 pkgs) + tests (59) + web build (14 routes). |

**Brand rename:** "Warm Trust" → "Calm Indigo" (palette name). `packages/ui` (`@sehatvault/ui`) is now a populated workspace — not a placeholder.

---

## In-Progress Tasks

> Each sprint now opens with a **Design** step (read `UX-Plan.md` + `Design-System.md` for the screens involved) and closes against the **Definition of Done** at the top of this file.

### Sprint 6 — PWA Polish + M1 Gate (built 2026-06-26 via the 2-agent flow)

> Delegated per [Multi-Agent-Workflow.md](./Multi-Agent-Workflow.md). Disjoint file ownership; lead-verified in the clean tree.

| Task | Status | Owner | Notes |
|------|--------|-------|-------|
| Records timeline grouping + filter chips | ✅ | A | `record-filter-chips.tsx` (grouped timeline + type filter) |
| `RecordCard` (icon + title + date + status icon+label) | ✅ | A | Type/status icons match `record_type`/`ocr_status` enums exactly |
| Skeleton / empty / error states (records + home) | ✅ | A | `record-skeleton.tsx`; `EmptyState` gained `intent="error"` |
| `OfflineBanner` (navigator.onLine, reduced-motion safe) | ✅ | A | Mounted in `app-shell.tsx` |
| Seed demo data (3 members + 6 records) | ✅ built / ⏳ not applied | A | `seed.sql` schema-validated; lead fixed email `.app`→`.dev`; **apply pending auth for remote write** |
| i18n keys (+28, en + hi) | ✅ | A | `records.timeline/type/status/source/filter.*`, `home.*`, `offline.banner.*` |
| PWA manifest + icons (192/512 maskable, apple-touch, favicon) | ✅ | B | `app/manifest.ts`; real PNGs |
| Service worker + install prompt | ✅ | B | `public/sw.js` + `sw-register.tsx`; never caches `/api`,`/auth`,`/storage`; Install text `TODO(i18n)` |
| `layout.tsx` PWA meta + theme-color | ✅ | B | mounts `<SwRegister/>` |
| Storage route hardening (`/api/records/[id]/file`) | ✅ | B | 403 unauth + RLS-invisible; `no-store`; 60s TTL; error details stripped |
| Unauth `/api/**` → 401 (middleware) | ✅ | B (rnd 2) | page routes still redirect to `/login`; `/` + `/home` preserved — verified live |
| Pixel-verify records timeline + `/records/[id]/edit` | ⏳ | lead | blocked until demo seed/user applied |
| Wire Install + marketing landing into `t()` | ⏳ | lead | |
| Upload retry; PWA install end-to-end | ⏳ | — | nice-to-have; not M1-gate-critical |
| **M1 demo gate:** upload 3-page PDF → stored, listed, opens via signed URL | ⏳ | lead | run after seed applied |

### Sprints 7–10 — AI Pipeline (E4, M2, Wk 7–10)
- **Design first:** TrendChart, ReviewCard (low-confidence correction UI), ProcessingCard, MedItem per `UX-Plan.md` §8 + Design-System motion (optimistic capture, processing states). Every new screen ships against the Definition of Done.
- `services/ai/` FastAPI + Dockerfile + Render deploy
- pgmq enqueue on ingest + worker drain loop (idempotent)
- `/api/ai/callback` HMAC-signed route handler
- Vision-LLM extraction → strict pydantic JSON schema
- Record-type classification
- **Golden eval harness** (50 de-identified docs) — T1 gate
- `lab_catalog` seed + normalisation (canonical/LOINC/units)
- Medicine parsing from prescriptions
- TrendChart + trends API
- ReviewCard (low-confidence correction UI)
- Chunk → embed → pgvector + 1-line summaries (en/hi)
- Per-record cost logging
- **M2 demo:** snap lab → trend chart; snap prescription → medicine list

### Sprints 11–13 — Use & Reach (E5/E6/E7, M3, Wk 11–13)
- **Design first:** ShareScopeForm, QRCard, ConsentRow, AccessLogRow, ReminderItem per `UX-Plan.md` §8; public `/s/[token]` doctor-share view is its own clean, no-chrome surface (Design-System §7). Ship against the Definition of Done.
- Doctor share (scope + expiry + `share_grant` table + public `/s/[token]` page)
- Access logging + revoke + `noindex` + kill-switch
- QRCard component
- Reminder model + `pg_cron` → `/api/cron/reminders` → **NotificationProvider** dispatch
- **`NotificationProvider`** interface + **MockNotificationProvider** (DB-persisted, in-app; default, no external setup)
- **TelegramNotificationProvider** (opt-in: user links Telegram → real reminder delivery) + `/api/webhooks/telegram`
- Notification history UI — shows **delivery channel + status**
- Taken/Skip tracking + refill hint
- Hindi catalog (complete, native review) + ElderModeProvider
- Accessibility pass (axe)
- **Should:** AI Q&A RAG with pgvector + citations
- **Future (not MVP):** SMSProvider, WhatsAppProvider, WhatsApp inbound capture (ADR-020)
- **M3 demo:** share via QR; reminder fires via Telegram (or in-app Mock); ask "last sugar?" in Hindi

### Sprints 14–16 — Trust, Billing & Beta (E8/E9/E10/E11, M4, Wk 14–16)
- **Design first:** consent dashboard, onboarding, emergency card, elder mode — these are the trust-defining surfaces; hold them to the highest Design-System bar. Ship against the Definition of Done.
- Consent dashboard (shares + access log views)
- Export job (zip: docs + structured JSON) + delete account (cascade + storage purge)
- DPDP acceptance tests (export complete; delete purges all) — C2 gate
- Security pass (CSP, key-leak build check, rate limits)
- Onboarding / empty / error / offline polish
- **Should:** Razorpay Free/Plus gating + webhook (**test mode only** at MVP — ADR-017)
- **Should:** Emergency card
- Analytics instrumentation
- 6-gate acceptance run
- Beta: 20–50 real families
- **Stretch:** ABDM sandbox M1+M3 demo

---

## Blockers

> **No remaining technical blockers on the MVP critical path.** The Supabase migration-history repair is **resolved** — remote history is clean sequential `0001`/`0002`, and `0002_family.sql` is applied to prod (see `ops/DB-Migrations.md`). No external-approval blockers — email OTP (ADR-019) removes DLT/SMS; Mock + Telegram (ADR-020) remove WhatsApp; billing is Razorpay test-mode.

| Blocker | Impact | Status |
|---------|--------|--------|
| ~~Supabase migration history repair~~ | Remote history realigned to sequential `0001`/`0002`; `0002_family.sql` applied to prod. | ✅ **Resolved** (2026-06-23) — runbook: `ops/DB-Migrations.md` |
| Apply `0003_harden_function_grants.sql` to prod | Function-grant hardening (advisors 0028/0029); committed + CI-gated, not yet pushed. | ⬜ Run `supabase db push` (operator, per runbook) |

### Not blockers (setup / risk)
| Item | Note |
|------|------|
| Telegram bot token (@BotFather) | Only for real delivery in M3; **MockNotificationProvider needs nothing** |
| Extraction accuracy (T1) | M2 risk — build the 50-doc eval set before trusting the AI pipeline |

### Deferred to future production (NOT blockers)
| Item | Why deferred |
|------|--------------|
| **PHI-to-LLM DPA / zero-retention (T5)** | **Production requirement, deferred until production** — MVP dev/test uses synthetic/de-identified data, so not an MVP-dev blocker |
| DLT registration / SMS OTP | Email OTP is canonical (ADR-019) |
| WhatsApp Business API | Future WhatsAppProvider + capture (ADR-020) |
| Razorpay production KYC + live keys | Future; MVP is test-mode (ADR-017) |

---

## Next Recommended Actions

1. **Sprint 6 — PWA Polish + M1 Gate** (apply the Definition of Done to every screen): timeline grouping + filters, empty/loading/error/offline states, offline banner, PWA manifest + service worker + icons, storage 403 hardening. **M1 demo gate:** upload 3-page PDF → stored, listed, opens via signed URL.
2. **Carry-overs from the landing work:** (a) pixel-verify `/records/[id]/edit` end-to-end with agent-browser; (b) **seed demo data** (one family + a few members + sample records) so screens demo well and aren't empty; (c) wire the marketing landing copy into `t()` (en + hi) + add a language toggle.
3. **Add `packages/db`** (generated Supabase TS types via `supabase gen types typescript`) — unlocks type-safe queries; do after any schema-stable sprint.
4. **Browser/E2E verification is unblocked** — `agent-browser` (v0.31) is installed. Use it as the standard pixel-check tool (`open` → `screenshot --full` → `set viewport <w> <h>` for mobile → click critical actions). Chrome-devtools MCP is still unavailable; don't rely on it.
5. **Apply `0003_harden_function_grants.sql` to prod** (`supabase db push`) — low priority, no blocker.
6. **Do not start `services/ai/`** until Sprint 7 — premature AI work is the #1 delivery risk.
7. **PHI-to-LLM DPA / zero-retention is a *production* requirement — deferred.** MVP dev/test uses synthetic data.
