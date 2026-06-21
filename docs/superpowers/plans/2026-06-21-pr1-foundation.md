# PR1 — Project Foundation & Tooling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a correct, empty monorepo skeleton — Turborepo + pnpm, Next.js 15 PWA app, Tailwind v4 + shadcn/ui, shared config/core/i18n packages, Supabase scaffolding, env validation, lint/format, and green CI — with zero product features.

**Architecture:** Turborepo + pnpm workspaces (ADR-016). One client `apps/web` (Next 15 App Router, ADR-001). Shared `packages/{config,core,i18n}` now; `packages/{db,ui}` added lazily when first consumed (per Engineering-Plan §4 "resist premature extraction"). Supabase (ADR-005) config + first migration scaffolded; no PHI tables, no RLS, no auth in PR1.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Radix + CVA), Turborepo, pnpm 9, Vitest, ESLint 9 (flat config) + Prettier, Supabase (Postgres + pgvector/pgmq/pg_cron), GitHub Actions, Sentry.

## Global Constraints

- Node: CI + `.nvmrc` = **22 LTS**; `engines.node = ">=20"`. pnpm = **9.x** via corepack (`packageManager` pinned).
- **Tailwind v4** — tokens live in CSS `@theme` (shared via an importable stylesheet in `packages/config`), not a v3 `tailwind-preset.ts`. (Decision D-1.)
- **Lean packages** — only `config`, `core`, `i18n` created in PR1; UI stays in `apps/web`. (Decision Q2.)
- **No product code** — no auth, no PHI tables, no RLS, no capture/AI/share/reminders. Out of scope for PR1.
- TypeScript `strict: true` everywhere. Dependencies point inward: `apps/web` → `packages/*`; packages never depend on apps; `core` depends on nothing framework-specific.
- No secret committed; only `NEXT_PUBLIC_*` are client-exposed. `.env.example` lists names only.
- Supabase region `ap-south-1`. Migrations are the schema source of truth.
- Do **not** modify the existing `README.md` (product spec) or `docs/` planning workspace. Dev docs → new `docs/Dev-Setup.md`.

---

### Task 1: Monorepo bones + shared tooling config

**Files:**
- Create: `package.json` (root), `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.nvmrc`, `.gitignore`, `prettier.config.mjs`, `.prettierignore`
- Create: `packages/config/package.json`, `packages/config/tsconfig.base.json`, `packages/config/eslint.config.mjs`, `packages/config/theme.css`

**Interfaces:**
- Produces: root scripts `pnpm dev|build|lint|typecheck|test` (delegated to turbo); `packages/config` exporting `tsconfig.base.json`, a flat ESLint config, and `theme.css` (the Tailwind v4 `@theme` token source).

- [ ] **Step 1: Provision pnpm + init git** — `corepack enable` exposes pnpm 9; `git init -b main`; branch `feat/pr1-foundation`.
- [ ] **Step 2: Write root workspace files** (`pnpm-workspace.yaml` → `apps/*`, `packages/*`; `turbo.json` pipelines for build/lint/typecheck/test; root `package.json` with `packageManager: pnpm@9.15.0`, `engines.node: >=20`, scripts delegating to turbo; `.npmrc` with `auto-install-peers=true`; `.nvmrc` = `22`).
- [ ] **Step 3: Write `.gitignore`** (node_modules, .next, .turbo, dist, .env*, coverage, supabase/.branches, supabase/.temp, *.log).
- [ ] **Step 4: Write `packages/config`** — `tsconfig.base.json` (strict, moduleResolution Bundler, target ES2022), flat `eslint.config.mjs` (typescript-eslint recommended), `prettier.config.mjs`, and `theme.css` with the Warm Trust tokens as Tailwind v4 `@theme` variables (color/type/spacing/radius/shadow/easing from Design-System §3–4).

---

### Task 2: `packages/core` — pure domain package with the first real test

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts`, `packages/core/src/health.ts`, `packages/core/src/health.test.ts`, `packages/core/vitest.config.ts`

**Interfaces:**
- Produces: `appVersion(): string` and `isNonEmptyName(s: string): boolean` from `@sehatvault/core` — trivial pure functions that prove the type + test lanes work before any domain logic lands.

- [ ] **Step 1: Write the failing test** (`src/health.test.ts`):
```ts
import { describe, it, expect } from "vitest";
import { isNonEmptyName } from "./health";
describe("isNonEmptyName", () => {
  it("rejects blank, accepts real names", () => {
    expect(isNonEmptyName("   ")).toBe(false);
    expect(isNonEmptyName("Ramesh")).toBe(true);
  });
});
```
- [ ] **Step 2: Run it, expect FAIL** — `pnpm --filter @sehatvault/core test`.
- [ ] **Step 3: Implement** (`src/health.ts`):
```ts
export const appVersion = (): string => "0.0.0";
export const isNonEmptyName = (s: string): boolean => s.trim().length > 0;
```
- [ ] **Step 4: Run it, expect PASS.** Re-export from `src/index.ts`.

---

### Task 3: `packages/i18n` — minimal i18n scaffold (ADR-015)

**Files:**
- Create: `packages/i18n/package.json`, `packages/i18n/tsconfig.json`, `packages/i18n/src/index.ts`, `packages/i18n/src/en.json`, `packages/i18n/src/hi.json`

**Interfaces:**
- Produces: `t(locale: "en"|"hi", key: string): string` and `Locale` type from `@sehatvault/i18n`; `en.json`/`hi.json` seeded with shell keys (`app.name`, `nav.home`, …).

- [ ] **Step 1:** Write `en.json` + `hi.json` with matching keys.
- [ ] **Step 2:** Write `t()` (flat-key lookup, falls back to `en` then the key). A real i18n lib slots in later.

---

### Task 4: `apps/web` — Next.js 15 + Tailwind v4 + fonts + env

**Files:**
- Create: `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/tsconfig.json`, `apps/web/postcss.config.mjs`, `apps/web/eslint.config.mjs`
- Create: `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`
- Create: `apps/web/src/lib/fonts.ts`, `apps/web/src/lib/env.ts`

**Interfaces:**
- Consumes: `packages/config` (tsconfig/eslint/theme.css), `packages/i18n` (`t`), `packages/core` (`appVersion`).
- Produces: a running PWA-ready Next app at `/` showing a minimal Warm-Trust-styled placeholder (no auth, no nav).

- [ ] **Step 1:** `package.json` (next@15, react@19, react-dom@19; deps on `@sehatvault/{config,core,i18n}`).
- [ ] **Step 2:** `globals.css` → `@import "tailwindcss";` then `@import "@sehatvault/config/theme.css";`; `postcss.config.mjs` → `@tailwindcss/postcss`.
- [ ] **Step 3:** `src/lib/env.ts` — zod-validated env; server-only keys never imported client-side.
- [ ] **Step 4:** `src/lib/fonts.ts` — Plus Jakarta Sans via `next/font/google`. `layout.tsx` applies font + `lang`; `page.tsx` renders the placeholder.
- [ ] **Step 5: Verify** — `pnpm --filter web build` (after Task 8 install).

---

### Task 5: shadcn/ui primitives (in `apps/web`, Tailwind v4)

**Files:**
- Create: `apps/web/components.json`, `apps/web/src/lib/utils.ts` (`cn`), `apps/web/src/components/ui/button.tsx`

**Interfaces:**
- Produces: `cn(...)` and a token-themed `<Button>` (CVA + Radix Slot). Future components via `npx shadcn@latest add <name>`.

- [ ] **Step 1:** `components.json` for Tailwind v4 + `@/` alias + `cssVariables: true`.
- [ ] **Step 2:** `cn` (clsx + tailwind-merge); `button.tsx` (CVA variants on Warm Trust tokens; `:active` scale(0.97) per Design-System §5).
- [ ] **Step 3:** Render the Button on `page.tsx`.

---

### Task 6: Supabase scaffolding (config + first migration + client libs)

**Files:**
- Create: `supabase/config.toml`, `supabase/migrations/0001_init.sql`, `supabase/seed/seed.sql`
- Create: `apps/web/src/lib/supabase/server.ts`, `apps/web/src/lib/supabase/client.ts`
- Modify: root `package.json` (add `db:types`, `db:push` script stubs using `supabase` devDep)

**Interfaces:**
- Produces: a migration enabling extensions + a `set_updated_at()` trigger function (no tables); Supabase SSR/browser client factories reading validated env.

- [ ] **Step 1:** `config.toml` — project id, region note `ap-south-1`, auth/storage defaults.
- [ ] **Step 2:** `0001_init.sql`:
```sql
create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_cron;
create extension if not exists pgmq;
create or replace function set_updated_at() returns trigger
  language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
```
- [ ] **Step 3:** Supabase `server.ts` (`@supabase/ssr`, cookie-based) + `client.ts` (browser, anon). Config only.
- [ ] **Step 4:** Add `supabase` devDep + `db:types`/`db:push` scripts (run against cloud project; **local stack needs Docker — documented, not required for PR1**).

---

### Task 7: CI + Sentry init + Dev-Setup docs

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/web/src/lib/sentry.ts`, `docs/Dev-Setup.md`, `.env.example`

**Interfaces:**
- Produces: CI gating every PR: install → lint → typecheck → unit tests → `apps/web` build → migration check (apply `supabase/migrations/*` to an ephemeral Postgres service via `psql`).

- [ ] **Step 1:** `ci.yml` — setup-node (22) + corepack pnpm; `pnpm install --frozen-lockfile`; `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build`; a `db` job with `postgres:16` service applying migrations via `psql`.
- [ ] **Step 2:** `.env.example` — names from Engineering-Plan §5 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `MSG91_AUTH_KEY`, `RAZORPAY_KEY_ID/SECRET`, `WHATSAPP_TOKEN/PHONE_ID`, `AI_CALLBACK_SIGNING_SECRET`, `SENTRY_DSN`), values blank.
- [ ] **Step 3:** `docs/Dev-Setup.md` — prerequisites (Node 22, pnpm 9, Docker for local Supabase), bootstrap, the Docker/Supabase-cloud caveat, admin checklist (DLT, WhatsApp, Razorpay, domain).

---

### Task 8: Install, verify green, commit

- [ ] **Step 1:** `pnpm install` at root.
- [ ] **Step 2:** `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build` — fix until green.
- [ ] **Step 3:** Commit in focused chunks on `feat/pr1-foundation`:
  1. monorepo bones + `packages/config`
  2. `packages/core` (+ test) + `packages/i18n`
  3. `apps/web` (Next + Tailwind v4 + fonts + env)
  4. shadcn primitives
  5. Supabase scaffolding
  6. CI + Sentry + `.env.example` + `Dev-Setup.md`
- [ ] **Step 4:** Report the green gate output verbatim. Do **not** push (no remote yet).

---

## Exit criteria (PR1 "done")
- Clean clone → `pnpm install && pnpm dev` runs the app; `/` renders the Warm-Trust placeholder with a themed Button.
- `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build` all green locally.
- CI workflow present; migration check applies `0001_init.sql` to ephemeral Postgres (runs once a GitHub remote exists).
- No PHI tables, no RLS, no auth, no secrets in the repo; `.env.example` complete.
- `README.md` and `docs/` planning workspace untouched; dev docs in `docs/Dev-Setup.md`.

## Self-review notes
- Spec coverage: maps to backlog E1.S1.1 (T1–T4) + tooling; auth/RLS deferred to PR2 (E1.S1.2).
- Type consistency: package names `@sehatvault/{config,core,i18n}` uniform; `cn`/`Button`/`t`/`appVersion` signatures fixed above.
- Placeholder scan: only intentional empty seeds (`seed.sql`) and blank env values — not unfinished code.
