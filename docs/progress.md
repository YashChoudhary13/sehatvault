# SehatVault — Progress Tracker

> **Related docs:** [Planning](planning/Planning.md) · [Decisions](Decisions.md) · [Engineering-Plan](architecture/Engineering-Plan.md) · [DOCUMENTATION](DOCUMENTATION.md)

> **Last updated:** 2026-06-23
> **Current milestone:** M1 — Manual Vault (Sprint 4 — Capture & Storage is next)
> **Active branch:** `main`
>
> **▶ RESUME HERE (next session):** M0 is **complete**. Sprint 3 (App Shell + Member CRUD) is **complete** — full member lifecycle live (`createMember` / `updateMember` / `deleteMember` Server Actions, all RLS-scoped via `auth_family_ids()`), shared `MemberForm` with `initialData` support, profile view with Danger Zone + `DeleteMemberButton` AlertDialog, edit page via `updateMember.bind(null, id)`. `0003_harden_function_grants.sql` still **pending `supabase db push`** to prod (low priority, no feature blocker). **Next: Sprint 4 (E3.S3.1)** — `CaptureSheet` (camera/gallery/PDF picker), private `documents` Supabase Storage bucket + storage RLS policies, `POST /api/ingest` route handler → `health_record(pending)` + pgmq job enqueue, signed-URL document viewer + **403-without-auth test** (the M1 storage gate). Read order: `../CLAUDE.md` → this file → `planning/Planning.md` §5 (Sprint 4).

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

## In-Progress Tasks

### Sprint 4 — Capture & Storage (E3.S3.1, Wk 4)
- CaptureSheet (camera / gallery / PDF, multi-page)
- Private `documents` Supabase Storage bucket + storage RLS
- `POST /api/ingest` → store file + `health_record(pending)` + idempotency
- Signed-URL viewer + **403-without-auth test**

### Sprint 5 — Record Detail & Manual Entry (E3.S3.2, Wk 5)
- Record list (timeline) + detail (document viewer)
- Manual structured entry / edit forms
- Record delete (logged)

### Sprint 6 — PWA Polish + M1 Gate (Wk 6)
- Timeline grouping + filters (type / date)
- Offline banner + upload retry
- PWA manifest + service worker
- Storage 403 hardening
- **M1 demo gate:** upload 3-page PDF → stored, listed, opens via signed URL

### Sprints 7–10 — AI Pipeline (E4, M2, Wk 7–10)
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

1. **Start Sprint 4 — Capture & Storage (E3.S3.1):** `CaptureSheet` component (camera/gallery/PDF picker), private `documents` Supabase Storage bucket with storage RLS policies, `POST /api/ingest` route handler → `health_record(pending)` + pgmq job enqueue, signed-URL document viewer. The **403-without-auth test** is the sprint gate (direct URL without session → 403).
2. **Migration `0004_health_records.sql`:** `health_record` table (status enum: `pending`/`processing`/`ready`/`error`, `storage_path`, `family_id`, `member_id`, RLS) + enable pgmq extension. Every PHI table needs 4 RLS policies + a CI isolation test extension.
3. **Apply `0003_harden_function_grants.sql` to prod** (`supabase db push`) — low priority, no blocker, but keeps remote in sync with CI.
4. **Add `packages/db`** (generated Supabase TS types via `supabase gen types typescript`) — unlocks type-safe queries; good to add once `0004` is applied.
5. **Do not start `services/ai/`** until Sprint 7 — premature AI work is the #1 delivery risk.
6. **PHI-to-LLM DPA / zero-retention is a *production* requirement — deferred.** MVP dev/test uses synthetic/de-identified data.
7. **Telegram bot token** needed for Sprint 12 (M3 notifications). MockNotificationProvider needs nothing — ship Mock first.
