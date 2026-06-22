# Dev Setup

> How to run **the same SehatVault app we deploy to production**, locally. Per **dev/prod parity**
> (12-factor), dev and prod use the **same backing services** (Supabase, Razorpay, Telegram, Claude) and
> the **same code paths** — only **config/keys differ** (test/sandbox vs production). There is no separate
> "dev-only" stack to productionise later.
>
> Product spec → root `README.md` + `docs/Vision.md`; planning → `docs/planning/Planning.md`. This file is the engineering bootstrap.

> **Related docs:** [Engineering-Plan](architecture/Engineering-Plan.md) · [DOCUMENTATION](DOCUMENTATION.md) · [Progress](progress.md)

## Prerequisites
- **Node 22 LTS** (`.nvmrc` pins 22; `engines.node >= 20`). `nvm use` if you have nvm.
- **pnpm 9** via corepack: `corepack enable` (repo pins `pnpm@9.15.0`).
- **Supabase CLI** (migrations against the linked project): `brew install supabase/tap/supabase` or `npm i -g supabase`.
- **Docker** — *optional*, only for the **local Supabase stack**. You may instead develop against a cloud dev project (same service, different keys — parity preserved).

## Bootstrap
```bash
pnpm install
cp .env.example .env.local     # fill with DEV/TEST keys (see table below)
pnpm dev                       # Next.js app at http://localhost:3000
```

## Backing services — same types in dev and prod; only keys differ
| Service | Dev config | Prod config | Parity note |
|---|---|---|---|
| **Supabase** (Auth Email OTP, Postgres **PG17**, Storage, RLS) | Cloud dev project in `ap-south-1`, or local stack (Docker) | Prod project in `ap-south-1` | Same schema + migrations; emails captured locally (Mailpit) or sent by Supabase in cloud |
| **Razorpay** | **Test-mode** keys | Live keys (future, post-KYC) | Same integration code; test vs live keys only |
| **Telegram** (NotificationProvider) | A **test bot** token (@BotFather) | Prod bot token | Same provider code. **MockNotificationProvider is the in-app default in dev *and* prod** when a user hasn't connected Telegram |
| **Claude** (from M2) | Low-volume key; **synthetic / de-identified** docs only | Prod key + DPA before real PHI | Same client; the DPA is a production-only gate |

## Migrations (sequential — ADR-021)
- Source of truth: `supabase/migrations/0001_init.sql`, `0002_…` — **sequential names, never timestamps**.
- Apply to the linked project: `supabase db push`. CI also applies them to an ephemeral Postgres.
- Remote history is currently sequential `0001`.

## Quality gate (what CI runs)
```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build
```

## Environment variables
Copy `.env.example` → `.env.local` (gitignored). Only `NEXT_PUBLIC_*` reach the browser; all other keys
are server/worker-only. **Same variable names in dev and prod — only the values (test vs live) differ.**

## Admin tasks
- **Telegram bot token** (@BotFather) for the TelegramNotificationProvider (M3).
- **Domain / trademark** check for "SehatVault".
- *Deferred to future production (not MVP):* DLT/SMS registration, WhatsApp Business (Meta), Razorpay production KYC.
