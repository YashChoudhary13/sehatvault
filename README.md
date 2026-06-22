# SehatVault

> A privacy-first, vernacular, **family-first health-record vault for India**. Snap or forward a medical
> document; AI organises it into a per-member health timeline with lab-value trends, medicine reminders,
> and one-tap, expiring doctor sharing — DPDP-compliant by design.

The product "why" (problem, market, personas, GTM, business model) → [`docs/Vision.md`](docs/Vision.md).

## Status
MVP in build. **M0 foundations done** (PR1); Sprint 2 (email-OTP auth + first RLS) is next. Live status →
[`docs/progress.md`](docs/progress.md).

## Stack (current)
- **Web:** Next.js 15 (App Router, RSC, Server Actions) — PWA, mobile-responsive
- **Backend:** Supabase — **Email OTP** auth, **Postgres 17** (+ pgvector, pgmq, pg_cron), Storage, RLS — region `ap-south-1`
- **AI (from M2):** Python FastAPI worker (Render) — vision-LLM extraction → structured, FHIR-aware data → pgvector
- **Notifications:** `NotificationProvider` — **Telegram** (real, opt-in) + **Mock** (in-app default)
- **Payments:** Razorpay (**test mode**)
- **Monorepo:** Turborepo + pnpm 9, Node 22, TypeScript strict, Tailwind v4 + shadcn/ui

> Deferred to future production: SMS/DLT, WhatsApp, live ABDM, native mobile, Razorpay production KYC.

## Run locally
```bash
corepack enable
pnpm install
cp .env.example .env.local     # fill DEV/TEST keys (Supabase, Razorpay test, Telegram test bot)
pnpm dev                       # http://localhost:3000
```
Quality gate: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter web build`.
Full setup (dev/prod parity, backing services, migrations) → [`docs/Dev-Setup.md`](docs/Dev-Setup.md).

## Documentation
Start at [`docs/DOCUMENTATION.md`](docs/DOCUMENTATION.md) — the docs map + topic owners. Key docs:

| Topic | Doc |
|---|---|
| Vision / "why" | [`docs/Vision.md`](docs/Vision.md) |
| Architecture | [`docs/architecture/Engineering-Plan.md`](docs/architecture/Engineering-Plan.md) |
| Database | [`docs/database/Schema.md`](docs/database/Schema.md) |
| API | [`docs/api/API-Spec.md`](docs/api/API-Spec.md) |
| Security / DPDP | [`docs/security/Security-Plan.md`](docs/security/Security-Plan.md) |
| Decisions (ADRs) | [`docs/Decisions.md`](docs/Decisions.md) |
| Planning | [`docs/planning/Planning.md`](docs/planning/Planning.md) |
| Progress | [`docs/progress.md`](docs/progress.md) |

## Status & license
Concept/build — solo-developer project. Not for production use with real PHI yet. The original full product
spec is archived at [`docs/history/Original-Product-Spec.md`](docs/history/Original-Product-Spec.md).
