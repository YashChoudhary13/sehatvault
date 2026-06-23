# SehatVault — Progress Tracker

> **Related docs:** [Planning](planning/Planning.md) · [Decisions](Decisions.md) · [Engineering-Plan](architecture/Engineering-Plan.md) · [DOCUMENTATION](DOCUMENTATION.md)

> **Last updated:** 2026-06-23
> **Current milestone:** M0 gate (Sprint 2 — auth + first RLS) in progress → M1 next
> **Active branch:** `main`
>
> **▶ RESUME HERE (next session):** Remote schema is **aligned** — `0001`/`0002` applied to prod, history clean sequential, migration-repair blocker **resolved** (runbook: `ops/DB-Migrations.md`). `0003_harden_function_grants.sql` is committed + CI-gated, **pending a `supabase db push`** to prod. #3 (RLS isolation test, the M0 gate) is done. Next feature: **app-lock PIN** (argon2; `app_user.app_lock_hash` column already exists) then **i18n locale switching** (wire from `app_user.locale`). Read order: `../CLAUDE.md` → this file → `planning/Planning.md` §5 (Sprint 2).

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

## In-Progress Tasks

### Sprint 2 — Auth + First RLS *(in progress)*

| Task | Status | Epic ref | Notes |
|------|--------|----------|-------|
| Migration `0002_family.sql` — `app_user`, `family`, `member_profile` + `auth_family_ids()` | ✅ written + validated | E1.S1.2.T6 | Validated vs live PG17 (BEGIN/ROLLBACK). **Pending `supabase db push`** |
| RLS policies for all three tables + `family` | ✅ | E1.S1.2.T6 | 4 policies each; default-deny; in `0002_family.sql` |
| Email-OTP login screen (`app/(auth)/login/`) | ✅ | E1.S1.2.T5 | Supabase Auth Email OTP (ADR-019); send-code → verify; typecheck green |
| `middleware.ts` — session refresh + route protection | ✅ | E1.S1.2.T5 | `src/middleware.ts` + `lib/supabase/middleware.ts`; protects all but `/login` |
| **RLS isolation test suite** added to CI | ✅ | E1.S1.2.T7 | `supabase/tests/` (auth stub + `rls_isolation.test.sql`); CI `db` job runs stub→migrations→test on PG17; verified locally (green isolated, red on injected leak) |
| App-lock PIN (argon2 hash in `app_user.app_lock_hash`) | ⬜ **← NEXT (plan ready)** | E1.S1.2.T8 | **Server-verify** (decision 2026-06-23). See plan below. |
| i18n locale switching (wire from `app_user.locale`) | ⬜ | E1.S1.2.T8 | login strings added (en/hi); locale hardcoded "en" for now |
| ~~Admin: DLT / WhatsApp / Razorpay KYC~~ → **deferred** | ➖ | E1.S1.2.T9 | Not MVP blockers (ADR-019/020) |

**▶ Next feature — App-lock PIN (E1.S1.2.T8) — implementation plan (server-verify, decided 2026-06-23):**
- **Guarantees:** a convenience re-entry gate over an *already-authenticated* session (not an auth boundary). 4–6 digit PIN; argon2 hash stored server-side in `app_user.app_lock_hash`; the hash never reaches the browser.
- **No DB/RLS change needed:** `app_lock_hash` already exists (`0002`); `app_user` is already RLS-isolated (user can only read/update own row) and covered by the RLS harness. Optional: add one positive-control assertion to `rls_isolation.test.sql` that a user CAN update its own `app_lock_hash` (and B still cannot update A's).
- **Domain logic (`packages/core`, framework-free, Vitest-first):** PIN policy/validation (length, digits-only, blocklist of trivial PINs e.g. `0000`/`1234`). Keep argon2 calls out of `core` (Node-only dep); core holds pure validation.
- **Server Actions (`apps/web`):** `setAppLockPin(pin)` → validate (zod) → `argon2.hash` → update own `app_user` row via RLS client; `verifyAppLockPin(pin)` → fetch own `app_lock_hash` → `argon2.verify` → `{ ok }`. Rate-limit verify attempts. Never log the PIN or hash. Use the `@node-rs/argon2` (or `argon2`) lib, server-only.
- **UI:** PIN setup in Settings; a re-entry lock screen in the `(app)` shell shown on resume/after idle; "forgot PIN" = re-auth via email OTP then reset. Respect elder-mode sizing.
- **CI/tests:** Vitest for the core PIN policy; Server Action contract test (zod) ; extend the existing RLS harness as above — do **not** add an ad-hoc test path. No "dev-only" mode.
- **Then:** i18n locale switching (wire `app_user.locale` → `t()`), the remaining Sprint 2 item.

**Sprint 2 exit gate (M0 milestone):**
- [ ] New **email** can sign in (email OTP) and create a family + one member
- [x] Automated RLS test proves family-B cannot read **or write** family-A's rows across `app_user`/`family`/`member_profile` (zero-leak) — `supabase/tests/rls_isolation.test.sql`, wired into the CI `db` job
- [ ] CI green on clean clone; one-command bootstrap works *(RLS `db` job verified locally on PG17; full CI confirms on push)*

---

## Pending Tasks

### Sprint 3 — App Shell & Members (E2, Wk 3)
- App shell + bottom-tab nav + desktop rail
- Home / family switcher + MemberCard component
- Member CRUD (create/edit: name, relationship, DOB, sex, blood group, allergies, conditions, emergency contact)
- Member delete (cascade + audit log)
- EmptyState set

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

1. **Start Sprint 2 with Email OTP** (ADR-019): wire Supabase Auth email OTP + `app/(auth)/login/`; create `supabase/migrations/0002_family.sql` (`app_user`, `family`, `member_profile` + `auth_family_ids()` + 4 RLS policies per table). The RLS isolation test CI job is the sprint gate.
2. **Drop the SMS/DLT/WhatsApp/KYC admin track** — no longer on the critical path. Only the domain/trademark check for "SehatVault" is worth doing early.
3. **Supabase project confirmed live** at `ap-south-1` (ref `lpyiuunahcqyigrtnjnm`, PG17), schema matches `0001_init.sql`; CLI not linked locally.
   - **Migration repair (ADR-021)** — remote history has timestamp names; realign to sequential before `0002`:
     ```bash
     supabase link --project-ref lpyiuunahcqyigrtnjnm
     supabase migration repair --status reverted 20260621031859 20260621032115
     supabase db push        # records local 0001_init.sql (idempotent; schema already correct)
     supabase migration list # expect: local 0001 == remote 0001
     ```
4. **Do not start `services/ai/`** until Sprint 7 — premature AI work is the top delivery risk.
5. **Add `packages/db`** (generated Supabase TS types) once the Sprint 2 schema exists.
6. **PHI-to-LLM DPA / zero-retention is a *production* requirement — deferred.** MVP dev/test uses synthetic/de-identified data; not needed to build M2.
7. **Telegram is the next notification provider to implement** (after Mock, in M3): get a bot token (@BotFather) before Sprint 12. The Mock provider needs nothing.
