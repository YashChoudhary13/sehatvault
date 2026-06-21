# Sprints — 16 Weekly Sprints (MVP)

> One-week sprints for a solo dev. Each: **Deliverables · Files/areas · Features (M-/S- IDs) · Tech debt incurred · Top risk.** Feature IDs trace to `../docs/MVP.md`; milestones to `../docs/Milestones.md`. End every sprint with the milestone's demo when applicable.

---

## M0 — Foundations (Wk 1–2)

### Sprint 1 — Repo & rails
- **Deliverables:** Turborepo+pnpm; `apps/web` Next.js 15 + Tailwind + shadcn; `packages/{config,ui,i18n,core,db}`; Supabase project (`ap-south-1`); migration tooling; CI (lint/typecheck/test/build); Sentry; `.env.example`.
- **Files:** `turbo.json`, `pnpm-workspace.yaml`, `apps/web/src/app/layout.tsx`, `packages/config/*`, `supabase/migrations/0001_init.sql`, `.github/workflows/ci.yml`.
- **Features:** scaffolding for all. **Debt:** placeholder theme tokens. **Risk:** none (setup).
- **Admin (parallel):** start DLT, WhatsApp Business, Razorpay KYC, domain/trademark.

### Sprint 2 — Auth + first RLS
- **Deliverables:** phone-OTP login (MSG91); `app_user`+`family`+`member_profile` migration **with RLS**; `auth_family_ids()`; **RLS isolation test** in CI; i18n en/hi wired; app-lock PIN.
- **Files:** `app/(auth)/login`, `lib/supabase/{server,client,middleware}.ts`, `middleware.ts`, `supabase/migrations/0002_family.sql`, `supabase/policies/*`, `tests/rls.spec`.
- **Features:** M-01, M-02, M-03(partial), M-04, M-21(scaffold). **Debt:** Twilio fallback not wired. **Risk:** T4 (RLS) — gate this sprint. **Demo (M0):** sign in → create family+member; isolation test green.

---

## M1 — Manual vault (Wk 3–6)

### Sprint 3 — Members & shell
- **Deliverables:** app shell + bottom nav; Home/family switcher; member CRUD + profile; empty states.
- **Files:** `app/(app)/page.tsx`, `members/[memberId]/*`, `packages/ui/MemberCard`, `EmptyState`.
- **Features:** M-03. **Debt:** member photo upload stubbed. **Risk:** low.

### Sprint 4 — Capture & storage
- **Deliverables:** CaptureSheet (camera/gallery/PDF, multi-page); private `documents` bucket + storage RLS; upload pipeline → `health_record(pending)`; signed-URL viewer.
- **Files:** `app/api/ingest/route.ts`, `components/CaptureSheet`, `migrations/0003_records.sql` (+storage policies), `lib/storage.ts`.
- **Features:** M-05, M-06, M-07(partial). **Debt:** no image compression yet. **Risk:** C1-adjacent (signed-URL correctness).

### Sprint 5 — Record detail & manual entry
- **Deliverables:** record list (timeline shell) + detail (doc viewer); manual structured entry/edit forms; record delete (logged).
- **Files:** `records/[recordId]/*`, `components/RecordCard`, `migrations/0004_observations_meds.sql`.
- **Features:** M-07, M-08, M-13(shell). **Debt:** timeline not yet grouped/filtered. **Risk:** low.

### Sprint 6 — Polish + M1 gate
- **Deliverables:** timeline grouping+filters; offline/upload-retry; PWA manifest+SW; harden storage access (403 test).
- **Files:** `app/manifest.ts`, `sw.ts`, `components/ProcessingCard`.
- **Features:** M-13. **Debt:** SW cache strategy minimal. **Risk:** S2 (DLT must be progressing). **Demo (M1):** add family → upload 3-page PDF → stored securely, listed, opens.

---

## M2 — AI auto-organise (Wk 7–10)

### Sprint 7 — Python worker + queue
- **Deliverables:** `services/ai` FastAPI + Dockerfile (Render); `pgmq` enqueue on ingest; worker loop; `/api/ai/callback` (HMAC); status realtime in UI.
- **Files:** `services/ai/app/{main,worker}.py`, `clients/*`, `app/api/ai/callback/route.ts`, `migrations/0005_pgmq.sql`.
- **Features:** M-09(infra). **Debt:** retry/backoff basic. **Risk:** T2/T3 (async + hosting) — design correctly now.

### Sprint 8 — Extraction + classification
- **Deliverables:** vision-LLM extract → strict JSON (pydantic); classify type; persist observations/medications; **golden eval harness** seeded (~50 docs).
- **Files:** `pipeline/{extract,classify}.py`, `schemas/*`, `evals/*`.
- **Features:** M-09, M-10, M-15(partial). **Debt:** handwriting weak (accepted). **Risk:** **T1** (accuracy) — primary focus.

### Sprint 9 — Normalisation, trends, review card
- **Deliverables:** `lab_catalog` seed; normalise lab→canonical/LOINC+units; TrendChart; **ReviewCard** for low-confidence; medicine parsing finalised.
- **Files:** `pipeline/normalize.py`, `migrations/0006_lab_catalog.sql`, `components/{TrendChart,ReviewCard,MedItem}`, `members/[id]/trends`.
- **Features:** M-11, M-12, M-14, M-15. **Debt:** trend "direction" heuristic simple. **Risk:** T1 continues.

### Sprint 10 — Embeddings + M2 gate
- **Deliverables:** chunk→embed→`pgvector`; 1-line summaries (en/hi); cost logging per record.
- **Files:** `pipeline/{embed,summarize}.py`, `migrations/0007_embeddings.sql`.
- **Features:** M-09(complete), ADR-011. **Debt:** Q&A UI not built (intended). **Risk:** B1 (AI cost) — start watching. **Demo (M2):** snap lab → trend; snap prescription → meds; eval bar met.

---

## M3 — Use & reach (Wk 11–13)

### Sprint 11 — Doctor share
- **Deliverables:** create-share (scope+expiry); 128-bit token (hash-at-rest); public `/s/:token` summary; access logging; revoke; `noindex`.
- **Files:** `app/api/share/[token]/route.ts`, `app/s/[token]/*`, `components/{ShareScopeForm,QRCard}`, `migrations/0008_shares.sql`.
- **Features:** M-17, M-19(partial). **Debt:** QR styling basic. **Risk:** **C1** (public PHI) — security review this sprint.

### Sprint 12 — Reminders
- **Deliverables:** reminder model; `pg_cron`→`/api/cron/reminders`; web-push + in-app; Taken/Skip; refill hint (Should).
- **Files:** `app/api/cron/reminders/route.ts`, `reminders/*`, `components/ReminderItem`, `migrations/0009_reminders.sql`.
- **Features:** M-16, S-04. **Debt:** iOS web-push limits (mitigated later by WhatsApp). **Risk:** ADR-014.

### Sprint 13 — Vernacular + Should layer + M3 gate
- **Deliverables:** Hindi complete; elder mode theme; **Should:** WhatsApp capture+reminders (if Meta approved), AI Q&A (RAG) with citations.
- **Files:** `packages/i18n/hi.json`, `ElderModeProvider`, `app/(app)/ask/*`, `app/api/webhooks/whatsapp/route.ts`.
- **Features:** M-21, S-01, S-02, S-03. **Debt:** regional langs deferred (N-01). **Risk:** S2 (Meta gate) — Should, won't block. **Demo (M3):** QR share; medicine reminder; ask "last sugar?" in Hindi.

---

## M4 — Trust, billing & beta (Wk 14–16)

### Sprint 14 — Consent, audit, export/delete
- **Deliverables:** consent dashboard (shares+access log); export job (zip docs+JSON); delete account (cascade+storage purge+tombstone).
- **Files:** `app/(app)/consent/*`, `app/api/account/{export,delete}/route.ts`, `components/{ConsentRow,AccessLogRow}`.
- **Features:** M-18, M-19, M-20. **Debt:** export format v1. **Risk:** **C2** (DPDP) — launch-blocking, must pass.

### Sprint 15 — Hardening + billing (Should)
- **Deliverables:** security pass (CSP, key-leak build check, rate limits); onboarding/empty/error/offline polish; **Should:** Razorpay Free/Plus gating.
- **Files:** `app/api/webhooks/razorpay/route.ts`, `migrations/0010_subscription.sql`, security configs.
- **Features:** S-05, S-06(emergency card if time). **Debt:** paywall copy minimal. **Risk:** B1 cost gating.

### Sprint 16 — Beta launch
- **Deliverables:** analytics instrumented; final acceptance-gate run (all 6); onboard **20–50 families**; feedback loop; **stretch:** ABDM sandbox M1+M3 demo.
- **Files:** `lib/analytics.ts`, runbook, beta onboarding scripts.
- **Features:** all MVP gates. **Debt:** logged into `Risks.md`/Phase-2 backlog. **Risk:** real-world extraction variance (T1) — monitor correction rate. **Demo (M4):** full loop + (stretch) "link ABHA" in sandbox.

---

## Velocity & buffer notes
- 16 sprints = the 4-month plan with **no slack**. Realistically bake in ~2–3 weeks buffer (illness, approvals, T1 iteration) → **~18–19 weeks** is the honest estimate (see `../tasks/Backlog.md` final recommendation).
- If behind at any gate: pull **cut levers** (`../docs/Scope.md §4`) — WhatsApp, billing, Q&A, regional langs go first. Never cut the spine.
