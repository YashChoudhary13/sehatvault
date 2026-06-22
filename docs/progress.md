# SehatVault — Progress Tracker

> **Last updated:** 2026-06-22
> **Current milestone:** M1 — Manual Vault (starting Sprint 2)
> **Active branch:** `main` (Sprint 2 branch not yet created)

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

### Sprint 2 — Auth + First RLS *(next sprint — not yet started)*

| Task | Status | Epic ref | Notes |
|------|--------|----------|-------|
| Migration `0002_family.sql` — `app_user`, `family`, `member_profile` + `auth_family_ids()` | ⬜ | E1.S1.2.T6 | Enums + 3 tables + helper function |
| RLS policies for all three tables + `family` | ⬜ | E1.S1.2.T6 | 4 policies each; default-deny |
| **RLS isolation test suite** added to CI | ⬜ | E1.S1.2.T7 | Family-A vs B; zero-leak invariant — this is the gate |
| Email-OTP login screen (`app/(auth)/login/`) | ⬜ | E1.S1.2.T5 | Supabase Auth **Email OTP** (canonical); **no SMS** (ADR-019) |
| `middleware.ts` — session refresh + route protection | ⬜ | E1.S1.2.T5 | Protects `(app)/` group |
| App-lock PIN (argon2 hash in `app_user.app_lock_hash`) | ⬜ | E1.S1.2.T8 | Client-side PIN; re-entry on resume |
| i18n locale wired from `app_user.locale` | ⬜ | E1.S1.2.T8 | |
| ~~Admin: DLT / WhatsApp / Razorpay KYC~~ → **deferred to future production** | ➖ | E1.S1.2.T9 | No longer MVP blockers (ADR-019/020); only domain/trademark check worth doing early |

**Sprint 2 exit gate (M0 milestone):**
- [ ] New **email** can sign in (email OTP) and create a family + one member
- [ ] Automated RLS test proves family-B cannot read family-A's member (zero-leak)
- [ ] CI green on clean clone; one-command bootstrap works

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

> **No external-approval blockers remain on the MVP critical path** — email OTP (ADR-019) removes the DLT/SMS gate; Mock + Telegram (ADR-020) remove the WhatsApp gate; billing launches free.

| Blocker | Impact | Status |
|---------|--------|--------|
| **PHI-to-LLM DPA** (Anthropic zero-retention terms) | Must be in place before M2 processes real PHI | ⚠️ Needs decision before Sprint 7 |
| **Telegram bot token** (@BotFather) | Needed for real Telegram delivery in M3 (Mock works without it) | ⬜ Get before Sprint 12 |
| **Migration history repair** | Remote has 2 timestamp migrations; local is sequential `0001` (ADR-021). Push will drift until repaired. | ⬜ Run repair before adding `0002_family.sql` (commands in Next Actions) |

### Deferred to future production (NOT blockers — ADR-019/020/017)
| Item | Why deferred |
|------|--------------|
| DLT registration | Email OTP is canonical (ADR-019); SMS OTP is future |
| SMS OTP | Future auth method once DLT completes |
| WhatsApp Business API | Future WhatsAppProvider + capture (ADR-020) |
| Razorpay production KYC | Future; billing launches free (ADR-017) |

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
6. **Agree on DPA posture for Claude API** before Sprint 7 processes real PHI.
7. **Get a Telegram bot token** (@BotFather) before Sprint 12 for `TelegramNotificationProvider`; the Mock provider needs nothing.
