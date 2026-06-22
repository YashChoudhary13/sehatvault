# PR1 — Project Foundation & Tooling

| | |
|---|---|
| **PR** | #1 — "Project foundation & tooling" |
| **Merge commit** | `511a42b` (squash) |
| **Follow-up fix** | `3be74aa` — pin `search_path` on `set_updated_at` (Supabase linter 0011) |
| **Branch** | `feat/pr1-foundation` |
| **Milestone** | M0 — Foundations & Guardrails |
| **Plan** | `docs/superpowers/plans/2026-06-21-pr1-foundation.md` |
| **Date merged** | 2026-06-21 |
| **Status** | ✅ Merged to `main` |

---

## What Was Implemented

A correct, **empty monorepo skeleton** with zero product features — the scaffolding all later work builds on:

- **Turborepo + pnpm 9 monorepo** (Node 22 LTS via corepack) with `build/lint/typecheck/test` pipelines.
- **`apps/web`** — Next.js 15 (App Router, React 19) PWA shell with Tailwind v4, a Warm-Trust-themed placeholder page, and a shadcn/ui `Button`.
- **`packages/config`** — shared `tsconfig.base.json` + `theme.css` (Tailwind v4 `@theme` Warm Trust tokens). *(ESLint flat config lives at repo root as `eslint.config.mjs`; Prettier as `prettier.config.mjs`.)*
- **`packages/core`** — pure-TS domain package with `appVersion()` + `isNonEmptyName()`, written test-first (Vitest green).
- **`packages/i18n`** — `en`/`hi` catalogs + `t(locale, key)` helper (ADR-015 i18n-from-Day-1).
- **`apps/web` libs** — zod-validated env (`lib/env.ts`), Sentry init stub with PHI scrubbing (`lib/sentry.ts`), Supabase SSR + browser client factories (`lib/supabase/{server,client}.ts`), `cn()` util.
- **Supabase scaffolding** — `config.toml` (`ap-south-1`), `0001_init.sql` (pgcrypto + `set_updated_at()` trigger; **no PHI tables, no RLS, no auth**), empty `seed.sql`.
- **CI** — `.github/workflows/ci.yml`: install → lint → typecheck → unit tests → web build, plus a `db` job applying migrations to an ephemeral `postgres:16`.
- **`.env.example`** — all key names, values blank.
- **`docs/Dev-Setup.md`** — prerequisites, bootstrap, Docker/Supabase-cloud caveat, long-lead admin checklist.

---

## Modified / Created Files

**Root tooling:** `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.nvmrc`, `.gitignore`, `.prettierignore`, `prettier.config.mjs`, `eslint.config.mjs`, `.env.example`, `pnpm-lock.yaml`

**`apps/web`:** `package.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `components.json`, `src/app/{globals.css,layout.tsx,page.tsx}`, `src/components/ui/button.tsx`, `src/lib/{env.ts,sentry.ts,utils.ts}`, `src/lib/supabase/{client.ts,server.ts}`

**`packages/config`:** `package.json`, `theme.css`, `tsconfig.base.json`

**`packages/core`:** `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/{index.ts,health.ts,health.test.ts}`

**`packages/i18n`:** `package.json`, `tsconfig.json`, `src/{index.ts,en.json,hi.json}`

**Supabase:** `config.toml`, `migrations/0001_init.sql`, `seed/seed.sql`

**CI / docs:** `.github/workflows/ci.yml`, `docs/Dev-Setup.md`, `docs/superpowers/plans/2026-06-21-pr1-foundation.md`

*(46 files, +3,692 lines. Full schema/architecture rationale lives in `architecture/Engineering-Plan.md` and `docs/Decisions.md` — not repeated here.)*

---

## Important Decisions Made / Confirmed

- **Lean package set** — only `config`, `core`, `i18n` created. `db` and `ui` are extracted lazily when first consumed (resist premature extraction). UI primitives stay in `apps/web` for now.
- **Tailwind v4 tokens in CSS `@theme`** (`packages/config/theme.css`), not a v3 preset file.
- **Feature Postgres extensions deferred** — `0001_init.sql` enables only `pgcrypto`; `pgvector`/`pg_cron`/`pgmq` are enabled by the migrations that first need them (M2/M3).
- **`set_updated_at()` has `search_path = ''` pinned** (follow-up fix `3be74aa`) to satisfy Supabase security linter 0011.
- **Strict scope discipline** — no auth, no PHI tables, no RLS, no product code; `README.md` and the `docs/` planning workspace were left untouched (dev docs went to the new `docs/Dev-Setup.md`).
- Confirms ADR-001 (web-first PWA), ADR-016 (Turborepo+pnpm), ADR-015 (i18n Day 1).

---

## Unfinished Work / Deferred to Next PRs

Everything product-facing — explicitly out of PR1 scope, lands next:

- **Auth** — phone-OTP login, sessions, `middleware.ts`, app-lock PIN → **Sprint 2 (next)**
- **First PHI tables + RLS** — `app_user`, `family`, `member_profile`, `auth_family_ids()`, the RLS isolation test suite → **Sprint 2 (gate)**
- **`packages/db`** — generated Supabase types + zod schemas → Sprint 2 (once tables exist)
- **`packages/ui`** — promoted from `apps/web` when shared
- **`services/ai/`** — entire Python worker → Sprint 7 (M2)
- Capture/storage, AI pipeline, doctor share, reminders, consent dashboard → M1–M4
- CI `db` job only runs meaningfully once a GitHub remote + migrations with tables exist; RLS test job not yet added.

---

## Verification at Merge

- `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build` — green locally.
- `/` renders the Warm-Trust placeholder with a themed Button.
- No secrets in the repo; `.env.example` complete.
