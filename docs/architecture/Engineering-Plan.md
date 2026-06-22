# Engineering Plan

> The "how we build it" companion to `../Decisions.md`. Monorepo, packages, folders, environments, deployment, branching, CI/CD, and testing — each with the *why*. Optimised for **one developer** who must move fast without creating a mess they can't maintain.

> **Related docs:** [Decisions](../Decisions.md) · [Schema](../database/Schema.md) · [API-Spec](../api/API-Spec.md) · [Security-Plan](../security/Security-Plan.md) · [Planning](../planning/Planning.md) · [Progress](../progress.md)

---

## 1. Monorepo (ADR-016: Turborepo + pnpm)

**Why a monorepo at all (solo dev):** the web app, shared TypeScript types, and database types must move together. A schema change should be one PR that updates the migration, the generated types, and the UI — not three repos and a version dance. Turborepo gives cached, parallel task running; pnpm gives fast, disk-efficient workspaces.

**Why the Python service lives *in* the repo but *outside* the JS workspace:** co-located for atomic changes and one CI, but it has its own toolchain (uv/poetry), so it is not a pnpm workspace member — it's a sibling directory with its own lockfile and Dockerfile.

```
sehatvault/
├─ apps/
│  └─ web/                  # Next.js 15 PWA — the only client (ADR-001)
├─ services/
│  └─ ai/                   # Python FastAPI worker (ADR-003) — own toolchain
├─ packages/
│  ├─ core/                 # framework-free domain logic (entities, scoping, share-token rules)
│  ├─ db/                   # generated Supabase types + typed query helpers + zod row schemas
│  ├─ ui/                   # shared shadcn/ui components, theme, elder-mode primitives
│  ├─ i18n/                 # message catalogs (en, hi) + t() helpers (ADR-015)
│  └─ config/               # eslint, tsconfig, tailwind preset, prettier — shared configs
├─ supabase/
│  ├─ migrations/           # SQL migrations — sequential names 0001_,0002_,… (ADR-021); source of truth, see ../database/Schema.md
│  ├─ policies/             # RLS policies (kept reviewable; applied via migrations)
│  ├─ functions/            # Edge Functions (e.g., telegram-webhook for notifications) — minimal at MVP
│  └─ seed/                 # dev seed data (synthetic only)
├─ docs/ architecture/ database/ api/ security/ design/ roadmap/ tasks/   # this planning workspace
├─ .github/workflows/       # CI/CD
├─ turbo.json  pnpm-workspace.yaml  package.json  .env.example  README.md
```

**Rule:** dependencies point **inward**. `apps/web` and `services/ai` depend on `packages/*`; `packages/*` never depend on apps. `packages/core` depends on nothing framework-specific (testable in isolation).

---

## 2. `apps/web` — Next.js 15 structure

App Router, Server Components by default, Server Actions for mutations, Route Handlers for webhooks/share/cron-callbacks. Supabase SSR client for auth-aware data access (RLS enforced by the user's JWT).

```
apps/web/src/
├─ app/
│  ├─ (auth)/login/                  # email OTP (ADR-019)
│  ├─ (app)/                         # authenticated shell (app-lock gate)
│  │  ├─ page.tsx                    # Home / family switcher
│  │  ├─ members/[memberId]/         # profile · timeline · trends · medicines
│  │  ├─ records/[recordId]/         # record detail + review card
│  │  ├─ reminders/  ask/  share/  consent/  settings/
│  ├─ s/[token]/                     # PUBLIC doctor-share view (no auth; token-gated)
│  ├─ api/
│  │  ├─ ingest/route.ts             # upload → create record + enqueue pgmq job
│  │  ├─ ai/callback/route.ts        # worker posts results back (service-role, signed)
│  │  ├─ share/[token]/route.ts      # resolve + log share access
│  │  ├─ cron/reminders/route.ts     # pg_cron → fire due reminders via NotificationProvider (ADR-020)
│  │  └─ webhooks/telegram/route.ts  # Telegram bot webhook (opt-in notifications, ADR-020)
│  └─ manifest.ts  sw.ts             # PWA manifest + service worker
├─ components/   hooks/   lib/supabase/{server,client,middleware}.ts
└─ middleware.ts                     # session refresh + route protection
```

**Why Server Actions + RLS instead of a REST gateway:** mutations run server-side with the caller's Supabase session; RLS is the authorization backstop, so even a logic bug can't cross families. The "API" (`../api/API-Spec.md`) is the contract for these handlers/actions, not a separate service.

---

## 3. `services/ai` — Python FastAPI worker

```
services/ai/app/
├─ main.py                 # FastAPI: /health, /extract (sync debug), worker loop entry
├─ worker.py               # pulls pgmq jobs → pipeline → writes results (idempotent)
├─ pipeline/
│  ├─ preprocess.py        # pdf→images, deskew/enhance (pypdfium2/OpenCV)
│  ├─ extract.py           # Claude vision → strict JSON (schema-validated)
│  ├─ classify.py  normalize.py   # record type; lab→canonical/LOINC, drug→generic, units
│  ├─ embed.py             # chunk → embeddings → pgvector
│  └─ summarize.py         # 1-line plain-language summary (+ hi)
├─ schemas/                # pydantic models == the JSON contract the LLM must return
├─ clients/{supabase,llm}.py
└─ tests/   evals/         # pytest + the golden eval harness (Risks.md T1)
```

**Why a worker loop, not just HTTP:** extraction is async (ADR-008). The service primarily **drains a queue**; the HTTP surface is for health + local debugging. It holds no state — crash-safe because jobs live in `pgmq` and writes are idempotent (keyed by `record_id`).

---

## 4. Package strategy

| Package | Owns | Depends on | Why separate |
|---|---|---|---|
| `core` | Domain rules: family scoping, share-token scope/expiry logic, reminder schedule math, FHIR-map adapters | nothing | Pure, unit-testable, reusable by web + (future) native. |
| `db` | Generated Supabase TS types, zod schemas per table, typed helpers | `core` | One source of truth for data shapes across server + client. Regenerated from migrations. |
| `ui` | shadcn/ui components, theme tokens, elder-mode + RTL-ready primitives | `i18n` | Consistent design system; elder mode is a theme, not a fork. |
| `i18n` | en/hi catalogs, `t()` | nothing | i18n from Day 1 (ADR-015); adding a language = adding a catalog. |
| `config` | eslint/tsconfig/tailwind/prettier presets | nothing | One lint/type config; no drift. |

**Rule of thumb:** code shared by **two** runtimes (server + client, or web + worker contract) earns a package; everything else stays local to `apps/web`. We resist premature extraction.

---

## 5. Environment strategy

**Three logical environments**, each a separate Supabase project + Vercel target + Render service:

| Env | Purpose | Data |
|---|---|---|
| `local` | dev on the laptop | Supabase local stack (Docker) or a personal cloud project; synthetic seed only |
| `preview` | per-PR Vercel deploys + a shared staging Supabase | synthetic / de-identified |
| `production` | live | real PHI; `ap-south-1`; restricted access |

**Secrets & config:**
- `.env.example` is committed (names only). Real values live in **Vercel/Render/Supabase env settings** and a local `.env.local` (git-ignored).
- **Client-exposed** vars are only `NEXT_PUBLIC_SUPABASE_URL` + the **anon** key (safe with RLS). The **service-role** key, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, and Razorpay (test) keys are **server/worker only** — never in `NEXT_PUBLIC_*`, never shipped to the browser.
- Key inventory (MVP): `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `RAZORPAY_KEY_ID/SECRET` (test mode), `AI_CALLBACK_SIGNING_SECRET` (HMAC between worker and `/api/ai/callback`), `SENTRY_DSN`. **Deferred (future production):** `MSG91_AUTH_KEY` (SMS/DLT), `WHATSAPP_TOKEN/PHONE_ID` (WhatsApp).
- **No secret is ever logged.** Sentry scrubbing on; structured logs redact tokens/PHI.

---

## 6. Deployment strategy

```
GitHub ──push──► CI (Actions) ──green──► deploys:
   apps/web      → Vercel        (auto preview per PR; promote main → prod)
   services/ai   → Render        (Docker image; deploy on main)
   supabase/*    → migrations applied via CI (supabase db push) to staging → prod (gated)
```

- **Web on Vercel** (ADR-001): preview URL per PR is the doctor-share view tester and the demo surface. Production is a manual promote.
- **AI on Render** (ADR-018): one small container; auto-deploy on `main`; health check gates traffic.
- **Supabase**: migrations are the schema source of truth. CI runs them against **staging** automatically; **production** migration is a gated manual approval (no auto schema change on prod). Storage buckets + policies are created via migration/setup scripts, not by hand.
- **Rollback:** Vercel instant rollback to previous deploy; Render redeploy previous image; DB changes are **forward-only, additive** migrations (never destructive in one step) so rollback = deploy previous app against the same schema.

---

## 7. Branch strategy (trunk-based, solo-tuned)

- **`main` is always deployable.** Protected: CI must pass; no direct force-push.
- **Short-lived feature branches** (`feat/…`, `fix/…`, `chore/…`) → PR → squash-merge. Even solo, the PR exists for the **preview deploy + CI gate + a diff to review against the milestone**.
- **Conventional Commits** → enables an automated changelog later; cheap discipline now.
- **No long-lived release branches** at MVP. Tag `v0.x` at each milestone (M1…M4) for a demoable snapshot.
- **One protected invariant in review:** any PR that adds a table/endpoint must add its **RLS test** (Risks.md T4) — enforced by a CI check that fails if a new table has no policy test.

---

## 8. CI/CD plan (GitHub Actions)

**`ci.yml` (every PR):**
1. `pnpm install --frozen-lockfile`
2. **Lint + typecheck** (turbo, cached) across packages + web.
3. **Unit tests** (`packages/core`, `db` schemas) — Vitest.
4. **DB check:** spin ephemeral Postgres → apply all migrations → run **RLS isolation tests** (the zero-leak suite) → fail on any cross-family read.
5. **Python CI:** `services/ai` → ruff + mypy + pytest (incl. a tiny extraction-contract test with a fixture image/mocked LLM).
6. **Build** `apps/web` (catches RSC/build issues).
7. (PR) **Vercel preview** auto-deploys; (optional) **Playwright smoke** against the preview for the critical path.

**`deploy.yml` (push to `main`):** apply migrations to **staging** → deploy web (Vercel prod promote is manual) + AI (Render) → smoke check. Production migration is a separate **gated** job.

**Why this shape:** the two things that can hurt users — a **schema/RLS mistake** and a **broken build** — are both blocked in CI before merge. Everything else (lint, format) is convenience.

---

## 9. Testing strategy

A solo dev can't test everything; we test what is **expensive to get wrong**.

| Layer | Tool | What we actually test | Priority |
|---|---|---|---|
| **RLS / isolation** | Postgres + SQL test harness in CI | family-B cannot read/write/storage-access family-A — **every table** | **P0 (non-negotiable)** |
| **Domain logic** | Vitest (`packages/core`) | share-token scope/expiry/revocation, reminder schedule math, FHIR mapping | P0 |
| **Extraction quality** | pytest + **eval harness** (`services/ai/evals`) | field-level accuracy vs golden set (Risks.md T1); confidence routing | P0 |
| **Critical-path E2E** | Playwright | onboard → upload → (mocked AI) organise → timeline; create share → open logged-out → expire/revoke; export/delete | P1 |
| **API contract** | Vitest + zod | route handlers/actions accept/return the documented schemas (`../api/API-Spec.md`) | P1 |
| **Component** | Vitest + Testing Library | review card, trend chart edge cases, elder-mode rendering | P2 |
| **Accessibility** | axe in Playwright | elder mode + base screens meet contrast/labels | P2 |

**Not doing at MVP:** exhaustive unit coverage of UI, load testing, contract tests against live external APIs (we mock Telegram/Razorpay/LLM in CI; smoke against real in staging only).

**Definition of "tested enough to launch":** the four P0 suites are green and the P1 E2E critical path passes on staging. That maps exactly to the `MVP.md` acceptance gates.

---

## 10. Observability & ops (lightweight)
- **Sentry** (web + Python) with PHI scrubbing.
- **Structured logs** with request/job IDs; never log document contents or tokens.
- **Audit log** (`access_log`) is product-level, not just ops — it backs the consent dashboard.
- **Uptime:** a simple cron ping on `/health` (web + AI). **Alerts:** Sentry → email/Telegram to the solo dev.
- **Cost watch:** a daily job logs LLM spend per active family (Risks.md B1).
