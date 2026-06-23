# SehatVault — Claude Code Project Memory

> Read this file + `docs/progress.md` + the relevant `docs/pr-history/` summary to orient fully in any session. The docs map + topic owners is `docs/DOCUMENTATION.md`. Do not re-read the entire docs tree unless you need domain detail.

---

## Project Overview

**SehatVault** is a privacy-first, vernacular, WhatsApp-friendly family health-record vault for India. An Indian caregiver snaps or forwards a medical document; AI reads it, classifies it, extracts structured data, and files it into a per-member health timeline with lab-value trends, medicine reminders, and one-tap doctor sharing — all DPDP-compliant.

**One-line pitch:** "The usable consumer product on top of India's ABDM/ABHA health-data rails — family-first, vernacular, WhatsApp-native."

**Primary users:** "Priya" (34, family health manager juggling elderly parent's BP, son's vaccines, her own thyroid) and "Arjun" (38, NRI managing parents remotely from abroad).

---

## Goals & Requirements

### MVP Must-Haves (the spine — never cut)
1. Email-OTP auth + app-lock PIN (Supabase Auth) — canonical login; **no SMS OTP** at MVP (ADR-019)
2. Family + member profiles with strict per-family RLS isolation
3. One-tap document capture (camera / gallery / PDF)
4. Encrypted private-bucket storage (India region, ap-south-1)
5. Async AI auto-organise → structured timeline (vision-LLM extraction)
6. Lab-value trend charts (HbA1c, fasting glucose, BP, TSH, Hb, creatinine…)
7. Medicine list parsed from prescriptions + active med tracking
8. Medicine + appointment reminders via a pluggable **NotificationProvider** — Mock (in-app, default) + Telegram (opt-in real delivery) (ADR-020)
9. Scoped, time-limited, revocable doctor-share link + QR code
10. DPDP consent dashboard + immutable access audit log
11. Export my data + delete account/data (first-class, not buried)
12. English + Hindi UI + elder mode (large font / high contrast toggle)

### Should-Have (slip first if behind schedule)
- AI Q&A (RAG) over family records with citations + "not medical advice" disclaimer
- Refill prediction ("BP strip runs out in ~4 days")
- Razorpay Free/Plus billing gating (UPI + cards + NRI international) — **test mode only** at MVP; production KYC + live keys are a **future** feature, not a blocker; launch free
- Emergency card (blood group, allergies, current meds, emergency contact QR)

### Post-MVP (explicitly out of v1.0)
- ABDM/ABHA live integration (Phase 2 — sandbox demo is a Phase-2 stretch)
- Native mobile app (React Native/Expo — Phase 2)
- 2+ regional languages with Bhashini live AI-output translation
- Full offline sync with conflict resolution
- App-layer field-level/envelope encryption (trigger: Significant Data Fiduciary threshold)
- Co-caregiver invites / multi-family RBAC (Phase 2 first feature post-launch)
- **Phone/SMS OTP login** (needs DLT registration) — email OTP is canonical at MVP (ADR-019)
- **Future NotificationProviders:** SMSProvider (needs DLT) + WhatsAppProvider (needs Meta approval) + WhatsApp document capture — all future production features, not blockers (ADR-020)

---

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Web client | **Next.js 15** (App Router, RSC, Server Actions) | PWA, mobile-responsive; no native binary at MVP (ADR-001) |
| Styling | **Tailwind v4** + shadcn/ui (Radix + CVA) | Tokens in `packages/config/theme.css` via CSS `@theme` |
| Language | **TypeScript strict** everywhere | |
| AI service | **Python FastAPI** worker on Render | Async OCR/extraction pipeline; stateless, drains pgmq |
| Database | **PostgreSQL 17 via Supabase** (`ap-south-1`) | PG17 is the standard (config.toml + remote); + pgvector (RAG) + pgmq (queue) + pg_cron (reminders) |
| Auth | **Supabase Auth — Email OTP** (canonical) + app-lock PIN | No SMS OTP at MVP; DLT deferred (ADR-019) |
| Notifications | **`NotificationProvider`** interface — Mock (in-app, default) + Telegram (opt-in) | SMS/WhatsApp = future providers (ADR-020) |
| Storage | **Supabase Storage** private bucket (`ap-south-1`) | AES-256 at rest; short-lived signed URLs only |
| LLM | **Claude** (vision for extraction, text for Q&A) | Smaller model for high-volume extraction; larger for RAG |
| Embeddings | Multilingual model → **pgvector** | Written from Day 1; Q&A UI ships as Should (ADR-011) |
| i18n | `@sehatvault/i18n` package | en + hi at MVP; elder mode; Bhashini = Phase 2 |
| Payments | **Razorpay — test mode only** (UPI + cards + international) | Should-have; production KYC + live keys are future, not a blocker (ADR-017) |
| Observability | **Sentry** (web + Python) with PHI scrubbing | Never log document contents or tokens |
| CI/CD | **GitHub Actions** → Vercel (web) + Render (AI service) | |
| Monorepo | **Turborepo + pnpm 9**, Node 22 LTS | |

**Deleted vs README:** No NestJS gateway. No Redis. No native mobile at MVP. (ADR-002, ADR-004, ADR-001)

---

## Architecture Summary

```
[Next.js 15 PWA] ──┬──► [Supabase: Auth · Postgres+pgvector+pgmq+pg_cron · Storage · RLS]
                   └──► [Python FastAPI worker (Render):
                              preprocess → extract → classify → normalise → embed → summarise]
                              ↑ jobs via pgmq; results posted to /api/ai/callback (HMAC signed)
```

**Key calls:**
- Next.js Route Handlers + Server Actions = the BFF (no separate gateway)
- Auth = Supabase **Email OTP** (canonical); no SMS OTP at MVP (ADR-019)
- pgmq = async job queue; pg_cron = reminder scheduler (no Redis)
- Notifications via a pluggable **`NotificationProvider`** — Mock (in-app, DB-persisted) + Telegram (opt-in); SMS/WhatsApp future (ADR-020)
- One Python FastAPI service for all AI work
- Relational schema, FHIR-aware at export/ABDM boundaries only
- Single-owner families at MVP; NRI/co-caregiver access via share links
- Baseline encryption (TLS + AES-256 at rest + RLS + private buckets); app-layer field encryption deferred
- ABDM deferred to Phase 2; schema stays FHIR-aware

**Canonical deep references (don't duplicate — link to them):** `docs/DOCUMENTATION.md` (docs map + topic owners) · `docs/architecture/Engineering-Plan.md` (monorepo/deploy/CI/testing) · `docs/database/Schema.md` (schema, RLS, storage) · `docs/api/API-Spec.md` (endpoints) · `docs/security/Security-Plan.md` (threat model, DPDP) · `docs/planning/Planning.md` (scope/milestones/sprints) · `docs/Vision.md` (product why) · `docs/history/Phase0-Architecture-Review.md` (pivot rationale).

---

## Folder Structure

```
sehatvault/
├── apps/web/src/
│   ├── app/
│   │   ├── (auth)/login/           # email OTP (Sprint 2)
│   │   ├── (app)/                  # authenticated shell
│   │   │   ├── page.tsx            # home / family switcher
│   │   │   ├── members/[id]/       # profile · timeline · trends · medicines
│   │   │   ├── records/[id]/       # record detail + review card
│   │   │   └── reminders/ ask/ share/ consent/ settings/
│   │   ├── s/[token]/              # PUBLIC doctor-share view (no auth required)
│   │   └── api/
│   │       ├── ingest/             # upload → health_record(pending) + pgmq job
│   │       ├── ai/callback/        # Python worker posts results (HMAC verified)
│   │       ├── share/[token]/      # resolve + log share access
│   │       ├── cron/reminders/     # pg_cron → fire due reminders via NotificationProvider
│   │       └── webhooks/telegram/  # Telegram bot webhook (opt-in notification delivery)
│   ├── components/   hooks/   lib/
│   └── middleware.ts               # session refresh + route protection
├── services/ai/                    # Python FastAPI worker (not a pnpm workspace)
│   └── app/pipeline/               # preprocess · extract · classify · normalise · embed · summarise
├── packages/
│   ├── core/                       # Pure TS domain logic; no framework deps; Vitest tested
│   ├── db/                         # Generated Supabase types + zod schemas (Sprint 2+)
│   ├── ui/                         # Shared shadcn components + elder-mode (lazy extraction)
│   ├── i18n/                       # en/hi catalogs + t() helper
│   └── config/                     # tsconfig.base · ESLint · Prettier · theme.css (Tailwind tokens)
├── supabase/
│   ├── migrations/                 # SQL source of truth (numbered; never edit applied migrations)
│   ├── policies/                   # RLS policies (applied via migrations)
│   └── seed/                       # Synthetic dev data only
├── docs/                           # ALL documentation (single tree) — map: docs/DOCUMENTATION.md
│   ├── DOCUMENTATION.md            # docs map + topic owners + authority rule
│   ├── progress.md                 # living status (read this) · Decisions.md (ADRs 001..021)
│   ├── Vision.md  Dev-Setup.md  Risks.md
│   ├── architecture/Engineering-Plan.md · database/Schema.md · api/API-Spec.md · security/Security-Plan.md
│   ├── design/{Design-System,UX-Plan}.md
│   ├── planning/Planning.md        # merged scope/milestones/roadmap/sprints/backlog
│   ├── pr-history/                 # one retrospective per merged PR
│   └── history/                    # FROZEN: Original-Product-Spec · Phase0-Architecture-Review · Planning-Archive
└── .github/workflows/ci.yml        # lint · typecheck · test · build · db migration check
```

---

## Coding Conventions

### TypeScript
- `strict: true` everywhere (all packages + apps/web)
- Server components by default in Next.js; add `"use client"` only when necessary
- Server Actions for mutations; Route Handlers for webhooks/callbacks/cron
- `packages/core` must have zero framework dependencies (pure TS, unit-testable in isolation)
- Dependencies point inward: `apps/web` → `packages/*`; packages never depend on apps

### Styling
- Tailwind v4 — tokens in `packages/config/theme.css` via CSS `@theme` variables (Warm Trust palette)
- `cn()` from `apps/web/src/lib/utils.ts` (clsx + tailwind-merge)
- shadcn/ui components added via `npx shadcn@latest add <name>` (Tailwind v4, `@/` alias, `cssVariables: true`)
- Never hardcode colours or spacing tokens inline

### Database / Supabase
- Every migration = a new **sequentially-numbered** SQL file in `supabase/migrations/` (`0001_`, `0002_`, …, **not** timestamps — ADR-021); never edit past migrations
- **Every PHI table must have RLS enabled** using `auth_family_ids()` — 4 policies (SELECT/INSERT/UPDATE/DELETE)
- `family_id` denormalised onto every PHI table for RLS performance
- `updated_at` via `set_updated_at()` trigger on every table with that column
- Service-role key = server/worker only; never in `NEXT_PUBLIC_*`, never to the browser
- Browser uses anon key + user JWT → RLS always applies client-side
- `access_log`: client has SELECT only; INSERT/UPDATE/DELETE = service-role only (keeps audit immutable)

### Security
- **Never log document contents, tokens, or PHI field values**
- Every new PHI table PR must include its RLS isolation test — CI fails without it
- Doctor-share tokens: 128-bit random, hash stored (token_hash), raw token only in URL
- All document delivery = short-lived signed URLs (≤60s), never permanent public URLs
- `noindex` + `Cache-Control: no-store` on all doctor-share pages

### Testing priorities
- **P0 — RLS isolation:** SQL test harness; family-B cannot read/write family-A across every table + storage
- **P0 — Domain logic:** Vitest on `packages/core` (share-token scope/expiry, reminder math, FHIR mapping)
- **P0 — Extraction eval:** pytest golden set (50 de-identified docs); typed lab values ≥ ~90% field accuracy
- **P1 — E2E critical paths:** Playwright (onboard → upload → timeline; share → expire/revoke; export/delete)
- **P1 — API contracts:** Vitest + zod on route handlers
- **P2 — Component + a11y:** Testing Library + axe in Playwright

### Git conventions
- Branches: `feat/…`, `fix/…`, `chore/…`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Squash-merge PRs; one PR per sprint/chunk
- `main` is always deployable; CI-protected
- Tag `v0.x` at each milestone gate (M1…M4)

### Comments
- Write no comments unless the WHY is non-obvious (hidden constraint, specific bug workaround, surprising invariant)
- Never describe what the code does; never reference the current task or PR number

---

## Important Design Decisions

Full ADR list: see `docs/Decisions.md` (canonical, ADR-001..021). Key decisions:
- **ADR-001:** Web-first PWA; no native mobile at MVP
- **ADR-002:** No NestJS gateway; Next.js + Supabase is the backend
- **ADR-004:** No Redis; pgmq + pg_cron instead
- **ADR-006:** Relational schema; FHIR mapping only at export/ABDM boundaries
- **ADR-009:** Single-owner families; NRI access via share links (co-caregiver = Phase 2 first feature)
- **ADR-012:** Baseline encryption only at MVP (conscious, documented tradeoff; revisit at SDF threshold)
- **ADR-013:** ABDM deferred to Phase 2; schema stays FHIR-aware
- **ADR-019:** Email OTP is canonical auth; no SMS OTP at MVP; DLT deferred (**supersedes ADR-007**)
- **ADR-020:** Pluggable `NotificationProvider` — Mock (in-app) + Telegram (opt-in) at MVP; SMS/WhatsApp future (**supersedes ADR-014**)
- **ADR-021:** Sequential migration naming (`0001`, `0002`, …), not timestamps; remote needs a one-time repair

---

## Current Implementation Status

**As of 2026-06-23 — M0 done (PR1 merged); Sprint 2 (auth + first RLS) in progress.**

### What exists
- ✅ Turborepo + pnpm 9 monorepo skeleton, Node 22, Tailwind v4
- ✅ `apps/web`: Next.js 15 PWA placeholder page with Warm-Trust themed Button
- ✅ `packages/config`: tsconfig.base, ESLint 9 flat config, Prettier, `theme.css` (Warm Trust design tokens)
- ✅ `packages/core`: `appVersion()` + `isNonEmptyName()` with passing Vitest test
- ✅ `packages/i18n`: en/hi message catalogs with `t()` helper
- ✅ `supabase/migrations/0001_init.sql`: pgcrypto extension + `set_updated_at()` trigger (no PHI tables)
- ✅ `supabase/config.toml` + `seed/seed.sql`
- ✅ `.github/workflows/ci.yml`: lint + typecheck + unit tests + web build + ephemeral Postgres migration check
- ✅ Sentry init stub (`apps/web/src/lib/sentry.ts`)
- ✅ Supabase client factories (`lib/supabase/server.ts` + `client.ts`)
- ✅ Env validation via zod (`lib/env.ts`)
- ✅ `.env.example` with all required key names
- ✅ `supabase/migrations/0002_family.sql`: `app_user`/`family`/`member_profile` + `sex_type` + `auth_family_ids()` + RLS + signup auto-provision (**written + validated vs live PG17; not yet `db push`-ed**)
- ✅ Email-OTP login (`app/(auth)/login/page.tsx`) + auth middleware (`src/middleware.ts`, `lib/supabase/middleware.ts`) — typecheck green
- ✅ i18n `auth.login.*` strings (en + hi)

### What does NOT exist yet
- ⚠️ PHI tables/RLS are DEFINED in `0002_family.sql` but **not yet applied** to the remote (run `supabase db push`)
- ❌ RLS isolation test (the M0 gate — **next: #3**)
- ❌ App-lock PIN; i18n locale switching (login strings exist; locale hardcoded "en")
- ❌ Member CRUD, document capture, encrypted storage
- ❌ AI pipeline (`services/ai/` — entire directory)
- ❌ Doctor share, reminders, consent dashboard
- ❌ `packages/db` (generated Supabase types — Sprint 2)
- ❌ `packages/ui` (promoted from `apps/web/components/ui` lazily)

---

## Milestone Status

| Milestone | Status | Sprint(s) |
|-----------|--------|-----------|
| M0 — Foundations & guardrails | ✅ Done | 1–2 partial |
| **M1 — Manual vault** | 🔄 Next | 2–6 |
| M2 — AI auto-organise | ⏳ Planned | 7–10 |
| M3 — Use & reach | ⏳ Planned | 11–13 |
| M4 — Trust, billing & closed beta | ⏳ Planned | 14–16 |

**Sprint 2 (in progress):** ✅ `0002_family.sql` migration (validated; pending `supabase db push`) · ✅ Email-OTP login (`app/(auth)/login/`) · ✅ auth middleware (`src/middleware.ts`).
**▶ Next session — start #3: RLS isolation test in CI** (the M0 gate): seed family A + B, assert with B's JWT that A's rows are unreadable/unwritable across `app_user`/`family`/`member_profile`; fail CI on any cross-family read. Then: app-lock PIN, i18n locale switching. **First run `supabase db push`** to apply `0002` (no API keys needed). Read order to resume: this file → `docs/progress.md` (▶ RESUME HERE) → `docs/planning/Planning.md` §5.
- App-lock PIN (argon2 hashing)
- Complete i18n en/hi wiring

**M1 exit gate:** Upload a 3-page PDF → stores securely, lists, opens via signed URL. Direct URL without auth → 403. Manual entry → structured record on timeline. Demo: "add family, upload a report, see it stored securely."

---

## Known Issues / Blockers

| Item | Priority | Notes |
|------|----------|-------|
| **Supabase migration history repair** | **Only open technical blocker** | Remote has 2 timestamp migrations; local is sequential `0001` (ADR-021). Realign before `0002_family.sql`; needs CLI linked. |

> **Migration repair is the only remaining technical blocker.** No external-approval blockers on the MVP critical path — Email OTP (ADR-019) removes DLT/SMS; Mock + Telegram (ADR-020) remove WhatsApp; billing is Razorpay test-mode.
>
> **Not blockers (risk/setup):** extraction accuracy (T1 — build the 50-doc eval set before trusting M2 AI); Telegram bot token (@BotFather, only for real delivery — Mock needs nothing).
>
> **Deferred to FUTURE production (not MVP):** PHI-to-LLM DPA / zero-retention (T5) · DLT registration · SMS OTP · WhatsApp Business API · Razorpay production KYC + live keys.

---

## Development Rules for Future Sessions

1. **Read `docs/progress.md` first** — it has the exact current sprint and next task.
2. **RLS is non-negotiable.** Every new PHI table must have 4 RLS policies using `auth_family_ids()` AND a CI isolation test in the same PR.
3. **No secrets committed** — `.env.example` has names only. Real values live in Vercel / Render / Supabase env settings.
4. **Service-role key = server/worker only.** Never `NEXT_PUBLIC_*`, never shipped to the browser.
5. **Do not build the Python AI service before Sprint 7.** Building AI before the manual vault is the #1 delivery risk.
6. **ABDM stays deferred** (ADR-013). Do not re-open before Phase 2.
7. **Notifications use the `NotificationProvider` interface** (ADR-020): Mock (in-app, default) + Telegram (opt-in) at MVP; SMS/WhatsApp are future providers. **Auth is email OTP** (ADR-019) — do **not** implement SMS OTP or depend on DLT.
8. **Migrations are forward-only and sequentially named** (`0001_`, `0002_`, … — ADR-021, not timestamps). Never edit an applied migration; add the next-numbered file.
9. **All AI extraction is async** (ADR-008). Upload returns immediately; pgmq job drives the Python worker; UI subscribes via Supabase Realtime or polls.
10. **Spine first.** Cut levers (billing, Q&A, regional langs, ABDM) in that order; never cut: auth+RLS, capture+storage, AI auto-organise, trends, share, reminders, DPDP.
11. **Tailwind tokens live in `packages/config/theme.css`.** Never hardcode colours.
12. **`packages/core` stays framework-free.** No React, no Next.js, no Supabase imports.
