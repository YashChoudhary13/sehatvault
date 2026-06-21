# Dev Setup

> Local development for the SehatVault monorepo (PR1 foundation). The product spec is in
> the root `README.md`; planning lives in `docs/`. This file is the engineering bootstrap.

## Prerequisites
- **Node 22 LTS** (`.nvmrc` pins 22; `engines.node >= 20`). `nvm use` if you have nvm.
- **pnpm 9** via corepack: `corepack enable` (the repo pins `pnpm@9.15.0`).
- **Docker** — only needed to run the **local Supabase stack**. Optional if you use a cloud project (see below).

## Bootstrap
```bash
pnpm install
pnpm dev          # Next.js app at http://localhost:3000
```

## Quality gate (what CI runs)
```bash
pnpm lint         # eslint (flat config) across the repo
pnpm typecheck    # tsc --noEmit per package (turbo)
pnpm test         # vitest (packages/core)
pnpm --filter web build
```

## Supabase
- **Cloud (recommended for now):** create a project in region **ap-south-1 (Mumbai)** (ADR-005),
  then set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- **Local stack (needs Docker):** `npx supabase start`, then `npx supabase db reset` to apply
  `supabase/migrations/*`. Docker is **not** installed in every environment — PR1 does not require it.
- Migrations are the schema source of truth. `supabase/migrations/0001_init.sql` enables `pgcrypto`
  and the shared `set_updated_at()` trigger. pgvector/pg_cron/pgmq are enabled later, by the
  migrations that first need them.
- CI validates migrations by applying them to an ephemeral `postgres:16` container.

## Environment variables
Copy `.env.example` to `.env.local` and fill in. Only `NEXT_PUBLIC_*` reach the browser; all other
keys are server/worker-only and must never be prefixed with `NEXT_PUBLIC`.

## Long-lead admin (start now, off the critical path)
- **DLT registration** (MSG91) — gates real phone-OTP login (PR2).
- **WhatsApp Business** application (Meta) — Should-have capture/reminders.
- **Razorpay KYC** — Should-have billing.
- **Domain / trademark** check for "SehatVault".
