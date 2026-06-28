# Decisions.md — Architecture Decision Records (ADRs)

> Every non-trivial decision, why it was made, and what would make us revisit it. Format per ADR: **Status · Context · Decision · Consequences · Revisit-when.** Status ∈ {Accepted, Accepted (MVP), Deferred, Proposed, Superseded}.
>
> These ADRs operationalise `history/Phase0-Architecture-Review.md`. Where the README and the constraints conflicted, the ADR records the resolution.

> **Related docs:** [Engineering-Plan](architecture/Engineering-Plan.md) · [Schema](database/Schema.md) · [API-Spec](api/API-Spec.md) · [Security-Plan](security/Security-Plan.md) · [Planning](planning/Planning.md) · [Progress](progress.md)

---

### ADR-001 — Web-first PWA (Next.js 15), not native mobile at MVP
- **Status:** Accepted (MVP)
- **Context:** README says RN/Expo mobile-primary; constraints say Next.js 15, web-first, mobile later. India is mobile-first, but app-store installs are themselves Tier-2/3 friction.
- **Decision:** Ship a single **Next.js 15 responsive PWA** (installable), mobile + desktop browsers. No native binary in v1.0.
- **Consequences:** One codebase, one deploy (Vercel), instant doctor-share web view, no review loop. Cost: weaker background push on iOS (mitigated by ADR-014), no app-store discovery. Browser camera is adequate for documents.
- **Revisit-when:** Retention shows native-only needs (background capture, push) or app-store distribution becomes a growth lever → Phase 2 native (`P-03`).

### ADR-002 — Delete the NestJS gateway; Next.js + Supabase is the backend
- **Status:** Accepted
- **Context:** README has a NestJS BFF in front of Postgres; constraints say Supabase + "no unnecessary microservices."
- **Decision:** Use **Next.js Route Handlers / Server Actions** as the BFF and **Supabase** (Auth, Postgres, Storage, RLS) as the data plane. No standalone Node gateway.
- **Consequences:** One fewer service to build, deploy, secure. Business logic lives in typed server code + Postgres (RLS, functions). Risk: logic sprawl in route handlers → mitigate with a `packages/core` domain layer (see Engineering-Plan).
- **Revisit-when:** Multiple clients need a shared non-Next API, or server logic outgrows route handlers.

### ADR-003 — Exactly one Python (FastAPI) service for AI
- **Status:** Accepted
- **Context:** Constraint: "AI: Python service." Python owns the best OCR/PDF/embeddings/FHIR ecosystem.
- **Decision:** One **FastAPI** service: preprocess → vision-LLM extract → classify → normalise → embed → summarise. Stateless; all state in Postgres/Storage.
- **Consequences:** Clean separation of the ML concern; demonstrates microservice design without microservice sprawl. Cost: a second runtime + deploy target (ADR-018).
- **Revisit-when:** Extraction can be done acceptably in TS *and* preprocessing/embeddings move to managed APIs → could fold in. Not expected at MVP.

### ADR-004 — No Redis; Postgres-backed queue + cron
- **Status:** Accepted (MVP)
- **Context:** README uses Redis for jobs/reminders/cache. Adds a stateful service.
- **Decision:** **Supabase Queues (`pgmq`)** for the OCR/extraction job queue; **`pg_cron`** for reminder scheduling; HTTP-level caching + Next.js cache for read caching.
- **Consequences:** Zero new infra; transactional jobs alongside data. Cost: Postgres queues are lower-throughput than Redis — fine at MVP volume; revisit at scale.
- **Revisit-when:** Job throughput or fan-out exceeds what `pgmq` handles comfortably → introduce a dedicated queue.

### ADR-005 — Supabase as the platform; region ap-south-1 (Mumbai)
- **Status:** Accepted
- **Context:** Need Postgres + auth + object storage + RLS + India residency, cheaply, solo-operable.
- **Decision:** **Supabase** project in **`ap-south-1`**. Postgres (+ `pgvector`, `pgmq`, `pg_cron`), Supabase Auth (email OTP — ADR-019), Storage (private buckets), RLS.
- **Consequences:** One console, one bill, generous free tier, residency satisfied. Lock-in risk mitigated by standard Postgres + S3-compatible storage (portable).
- **Revisit-when:** Scale/cost or compliance demands self-managed Postgres on AWS Mumbai (README's stated scale target).

### ADR-006 — Relational model, FHIR-aware at the boundaries (not FHIR-native storage)
- **Status:** Accepted
- **Context:** README explicitly warns against FHIR-ing the whole DB.
- **Decision:** Internal schema is plain relational; map to **FHIR R4** only at export/ABDM boundaries. Keep FHIR-friendly fields (LOINC on observations, standard codes where known).
- **Consequences:** Simple queries, fast iteration; FHIR mapping is a thin adapter when ABDM arrives.
- **Revisit-when:** Never expected to flip; ABDM consumes the mapping layer.

### ADR-007 — Phone-OTP auth via MSG91 (Supabase Auth); app-lock PIN
- **Status:** ⚠️ **Superseded by ADR-019 (2026-06-22)** — MVP auth is now **email OTP**, not SMS. Kept for history. (App-lock PIN decision carries forward unchanged.)
- **Context:** India is phone-first. Indian SMS needs TRAI **DLT** template registration. ABHA login is Post-MVP.
- **Decision:** **Supabase Auth phone provider** backed by **MSG91** (Twilio fallback). Client-side **app-lock PIN** (and biometric where the browser supports WebAuthn) for re-entry.
- **Consequences:** Familiar UX; DLT registration is a long-lead admin task (start Week 1). Cost per OTP is a real variable cost.
- **Revisit-when:** WhatsApp OTP (post Meta approval) becomes cheaper/smoother; ABHA login in Phase 2.

### ADR-008 — Async-by-default AI pipeline
- **Status:** Accepted
- **Context:** Vision extraction takes 10–60s; serverless requests time out (risk T2).
- **Decision:** Upload **returns immediately** with `ocr_status = pending`; a `pgmq` job drives the Python worker; the UI subscribes (Supabase Realtime) / polls for status; results patch the record.
- **Consequences:** Responsive UX, no timeouts, natural retry/back-pressure. Cost: more states to design (pending/done/needs_review) — already in the data model.
- **Revisit-when:** n/a (this is the right shape).

### ADR-009 — Single-owner families at MVP; share links bridge caregivers
- **Status:** Accepted (MVP)
- **Context:** README allows multi-family membership + per-member `member_scope` RBAC — the biggest schema/RLS complexity source. But the NRI sibling persona needs cross-caregiver access.
- **Decision:** MVP = **one owner per family**, members are **profiles** (not necessarily users). Cross-caregiver need served by **scoped share links**. **Co-caregiver invite** (second user, viewer/manager) is the **first post-launch feature** (`N-04` → Phase 2 early).
- **Consequences:** RLS reduces to "owner sees their family" — simple and auditable. Cost: an NRI sibling initially uses a link, not a login.
- **Revisit-when:** Immediately post-launch: add co-caregiver membership (Phase 2, `P-06` for full RBAC).

### ADR-010 — Claude for vision extraction + reasoning; tiered + cost-capped
- **Status:** Accepted
- **Context:** Need strong multilingual vision + structured output; per-record AI cost is the main variable cost.
- **Decision:** **Claude** — a smaller/faster model for high-volume extraction, a larger model for RAG/summaries. Strict JSON schema output. Per-record **cost ceiling** + caching; gate heavy AI behind Plus later.
- **Consequences:** Good accuracy + structured output; predictable cost. Dependency on an external API (see ADR-012 / risk T5 for PHI residency).
- **Amended 2026-06-22:** the PHI-to-LLM **DPA / zero-retention** posture (T5) is a **production requirement, deferred until production**. MVP dev/test uses **synthetic / de-identified** data only, so the DPA is **not an MVP-dev blocker**.
- **Revisit-when:** Cost or residency pressure → evaluate an in-region/self-hosted model for extraction; secure the DPA **before** any real PHI is processed in production.

### ADR-011 — pgvector embeddings from Day 1; Q&A (RAG) is Should-have
- **Status:** Accepted (MVP)
- **Context:** Q&A is a differentiator but a README cut-line.
- **Decision:** Write **chunk embeddings to `pgvector`** as records are processed (cheap, Day 1). Ship the **Q&A UI as Should** — a thin retrieval+answer layer added once the spine is stable.
- **Consequences:** No expensive backfill later; Q&A can slip without losing future readiness.
- **Revisit-when:** n/a.

### ADR-012 — Baseline encryption at MVP; defer field-level/envelope encryption
- **Status:** Accepted (MVP) — **conscious tradeoff**
- **Context:** README asks for app-layer field encryption + per-object envelope keys. For a solo dev this is a large key-management + availability surface that fights Supabase signed URLs/RLS/RAG.
- **Decision:** MVP security = **TLS 1.2+** in transit, **AES-256 at rest** (Supabase/storage), **strict default-deny RLS**, **private buckets + short-lived signed URLs**, **scoped revocable logged share tokens**, **India residency**, **immutable audit log**. **No** app-layer field/envelope encryption at MVP.
- **Consequences:** Meets DPDP "reasonable safeguards" and ships. Accepts that a platform-level compromise/over-privileged service key could read plaintext (documented in Security-Plan threat model).
- **Revisit-when:** Before Significant-Data-Fiduciary status, before any B2B2C data sharing, or before first external audit — whichever first (`P-05`).

### ADR-013 — Defer live ABDM/ABHA; keep schema FHIR-aware
- **Status:** Deferred (Phase 2)
- **Context:** ABDM is credibility + resume gold but a multi-week sandbox/sign-off swamp; README names it the #1 cut.
- **Decision:** **No live ABDM in v1.0.** Data model stays FHIR-aware so ABDM slots in cleanly. A **sandbox M1+M3 demo** is a Phase-2 stretch.
- **Consequences:** Protects the 4-month timeline; MVP value is standalone.
- **Revisit-when:** Post-launch, when network records and a demo narrative justify the investment.

### ADR-014 — WhatsApp is the primary nudge channel and a Should-have capture path — never on the critical path
- **Status:** ⚠️ **Superseded by ADR-020 (2026-06-22)** — notifications now go through a pluggable `NotificationProvider` (Mock + Telegram at MVP); WhatsApp becomes a *future* provider. Kept for history.
- **Context:** WhatsApp Cloud API needs Meta Business verification + number + template approval (external, approval-gated). It also neatly solves PWA's weak iOS push.
- **Decision:** Architect reminders to deliver via **WhatsApp when available**, **web-push/in-app otherwise**. WhatsApp **capture** (`S-01`) ships when Meta approval lands. **No launch dependency on Meta.**
- **Consequences:** Best-of-both nudges; launch is never blocked by an approval queue.
- **Revisit-when:** Post Meta approval → promote WhatsApp capture + reminders to default.

### ADR-015 — i18n from Day 1; English + Hindi at launch; elder mode in
- **Status:** Accepted (MVP)
- **Context:** Retrofitting i18n is painful; full 3-language + live AI translation is scope.
- **Decision:** **i18n scaffolding Day 1**; ship **English + Hindi** UI strings + **elder mode** (large font/high contrast). Regional languages + Bhashini live translation are Nice (`N-01`).
- **Consequences:** Honors the vernacular principle without a translation-pipeline rabbit hole.
- **Revisit-when:** Beta geography fixes the 2 regional languages to add.

### ADR-016 — Monorepo: Turborepo + pnpm
- **Status:** Accepted
- **Context:** One web app, shared types, a Python service, shared config. Solo dev wants atomic changes across web + shared packages.
- **Decision:** **Turborepo + pnpm workspaces.** `apps/web` (Next.js), `services/ai` (Python, outside the JS workspace), `packages/*` (shared TS).
- **Consequences:** One repo, one PR per change, shared types between DB and UI. (Full layout in `architecture/Engineering-Plan.md`.)
- **Revisit-when:** n/a at this scale.

### ADR-017 — Payments via Razorpay (Should-have)
- **Status:** Accepted (MVP, Should)
- **Context:** Need UPI + cards + international (NRI). KYC is a long-lead task.
- **Decision:** **Razorpay** (Cashfree fallback). Free/Plus gating at the app layer. **Amended 2026-06-22:** **test mode only** at MVP (Razorpay test keys; no live transactions). Production KYC + live keys are a **future production feature, not an MVP blocker** — launch free, add the paywall later.
- **Consequences:** Indian + diaspora monetisation; paywall is a fast-follow, not a blocker.
- **Revisit-when:** International-card economics or NRI billing UX demand a dedicated processor.

### ADR-018 — Python AI service hosted as a single container (Render)
- **Status:** Accepted (MVP)
- **Context:** Vercel hosts Next.js; long-running vision calls don't fit serverless timeouts well (T2/T3).
- **Decision:** Deploy the FastAPI worker as **one small container on Render** (Railway/Fly equivalent). It pulls jobs from `pgmq`, writes results to Postgres/Storage.
- **Consequences:** No timeout constraints; cheap; stateless and horizontally scalable later.
- **Revisit-when:** Volume warrants autoscaling/GPU or moving to AWS Mumbai with the DB.

### ADR-019 — Email OTP is the canonical auth; no SMS OTP at MVP (supersedes ADR-007)
- **Status:** Accepted (MVP) — **supersedes ADR-007**
- **Context:** Phone OTP (ADR-007) required TRAI **DLT** template registration via an SMS provider (MSG91/Twilio) — a multi-week, approval-gated, long-lead dependency with per-OTP cost, and it was the single biggest external gate on the launch critical path. The wedge users (caregivers, NRIs) can authenticate by email with zero approval friction.
- **Decision:** Use **Supabase Auth Email OTP** (magic link / 6-digit code) as the **canonical** authentication flow. **Do not implement SMS OTP** at MVP. **DLT registration is deferred** to a future production phase. **App-lock PIN** (+ WebAuthn biometric where supported) for re-entry carries forward from ADR-007.
- **Consequences:** Auth has **zero external-approval dependency** → launch is no longer gated by DLT/SMS. No per-OTP SMS cost. Trade-off: email is marginally less "India-phone-first" than SMS, but it removes the largest launch risk. Phone/SMS OTP and ABHA login become future enhancements.
- **Revisit-when:** DLT completes and SMS (or WhatsApp) OTP is wanted as an additional method; ABHA login in Phase 2.

### ADR-020 — Pluggable `NotificationProvider`; Mock + Telegram at MVP (supersedes ADR-014)
- **Status:** Accepted (MVP) — **supersedes ADR-014**
- **Context:** ADR-014 made WhatsApp the primary nudge channel, but WhatsApp Cloud API needs Meta Business verification + template approval (external, multi-week). We want a real, working notification path for MVP with **no approval gate**, plus a clean seam to add real channels later.
- **Decision:** Define a **`NotificationProvider` interface** with pluggable implementations. MVP ships two:
  - **MockNotificationProvider** — default; **no external setup**; persists messages to the DB and renders them as **in-app notifications**; used for demos/testing.
  - **TelegramNotificationProvider** — **optional per-user** integration; the user connects their Telegram account and receives **real** reminders/notifications via Telegram. This is the real notification workflow for opted-in MVP users.
  - **Routing:** users **without** Telegram get in-app (Mock) notifications; users **with** Telegram enabled get Telegram delivery. **Notification history records the delivery channel and status.**
  - **SMSProvider** and **WhatsAppProvider** are **future** implementations of the same interface (no MVP work).
- **Consequences:** A working, demoable notification system with zero external approval. The interface isolates channel specifics, so SMS/WhatsApp slot in later without touching reminder logic. Telegram Bot API is simple (bot token + chat id) and free. Trade-off: Telegram is less ubiquitous in India than WhatsApp, but it is unblocked today and proves the architecture.
- **Revisit-when:** WhatsApp Business API approval lands (add WhatsAppProvider); DLT completes (add SMSProvider).

### ADR-021 — Sequential migration naming (`0001`, `0002`, …), not timestamps
- **Status:** Accepted (MVP)
- **Context:** The repo ships `supabase/migrations/0001_init.sql` (sequential), but the remote project was migrated with the Supabase CLI's default **timestamp** names (`20260621031859_init`, `20260621032115_harden_set_updated_at_search_path`). The two conventions diverge, so `supabase db push` would treat the local `0001` as unapplied and the histories would drift.
- **Decision:** **Sequential, zero-padded names are canonical** (`0001_init.sql`, `0002_family.sql`, `0003_…`). One migration file per PR/sprint; **never edit an applied migration** — add the next number. The remote history is realigned to sequential via `supabase migration repair` (commands tracked in `progress.md`).
- **Consequences:** Predictable, reviewable ordering that matches the backlog/sprint plan and the CI psql loop (`for f in supabase/migrations/*.sql`). One-time repair needed to retire the two timestamp entries on the remote.
- **Revisit-when:** Multiple developers create migrations concurrently and sequential numbers start colliding → reconsider timestamps with a merge discipline.

### ADR-022 — Design overhaul: Calm Indigo palette + motion tiers + `packages/ui` foundation
- **Status:** Accepted (2026-06-27, branch `feat/design-overhaul`)
- **Context:** The original "Warm Trust" system (teal + amber-on-stone) produced a clean but static, utilitarian feel — "safe government portal" — that didn't match the premium, trustworthy product ambition. The system needed to feel alive and purposeful without betraying core constraints: mid-range Android performance, India data costs, WCAG AA, `prefers-reduced-motion`, elder mode, and the privacy-calm tone. The risk was overshooting into flashy/anxious UI — equally wrong for a health-data product.
- **Decision:**
  - **Retire "Warm Trust"; adopt "Calm Indigo"** as the brand palette name and primary colour system: primary `#4F46E5` (indigo), accent `#14B8A6` (teal, sparing), tint surface `#EEF2FF`, bg `#FBFBFE`, ink `#0F1729`, muted `#64748B`, border `#E5E7EB`, success `#059669`, warn `#D97706`, danger `#E11D48`. Extended with elevation ladder (`--elev-0..4`), gradient tokens (`--mesh-hero`, `--mesh-section`, `--glow-accent`), and motion tokens (`--motion-calm`, `--motion-standard`, `--motion-expressive`).
  - **Add `--font-display`** (Bricolage Grotesque via `next/font`) for headings; body remains Plus Jakarta Sans.
  - **Three motion tiers** (calm / standard / expressive) — all degrade gracefully under `prefers-reduced-motion` AND elder mode; no 3D (rich 2D motion only).
  - **Populate `packages/ui`** (`@sehatvault/ui`) with canonical design-system primitives: motion (`resolveMotion`, `useMotionTier`, `MotionTierBox`/`Reveal`, `PageTransition`) and components (`Card`, `Button`, `EmptyState`, `Section`, `GradientField`, `HeroMedia`, `cn`). Consumes only `@sehatvault/config`; `apps/web` transpiles it.
  - **Build on a hidden `/design-preview` route** (gated out of production via middleware) → refactor landing → refactor in-app.
  - **Dark mode:** token-ready (semantic CSS variable names) but **not built** — light-only ship; flip later with no rework.
  - **Richer `/home` dashboard:** greeting + stats row (`summarizeDashboard` in `packages/core`) + recent-records strip + reused `UploadSection`. Uses only existing data/endpoints — no new tables or RLS changes.
  - **Hero video/poster (Task 9) deferred:** `HeroMedia` component exists and is ready to wire; Higgsfield assets could not be generated in-environment; CSS device mockup retained. Apply recorded elder-mode `HeroMedia` fix at wire-time.
- **Consequences:** Warm Trust name and teal-primary palette are retired across all docs and tokens. `packages/ui` is now a real, populated workspace — not a placeholder. Landing and in-app are on a shared primitive layer; future surfaces extend from `@sehatvault/ui` rather than duplicating motion/component logic in `apps/web`. Authed in-app live pixel-verify (desktop + 390px mobile) is pending a logged-in session (email-OTP login cannot be automated in-environment) — state this honestly, don't claim live-verified.
- **Revisit-when:** Hero video assets are ready → wire `HeroMedia` (add elder-mode check at that time); dark mode investment is warranted → flip CSS variable values in `theme.css`.

### ADR-023 — M2 AI worker: OpenAI-compatible SDK; default provider Google Gemini
- **Status:** Accepted (2026-06-28, Sprint 7)
- **Context:** The original tech-stack doc listed "Claude" as the extraction LLM (ADR-010). During Sprint 7, the worker needed a usable default that: (a) works with the OpenAI Python SDK's standard interface so any provider can be swapped in one file; (b) supports vision (for document OCR) and embedding (768-dim for pgvector); (c) has a functional free/demo tier so the key can remain blank and the worker still starts. Google Gemini satisfies all three — `gemini-2.5-flash` handles vision + summarisation; `text-embedding-004` produces 768-dim embeddings; both are reachable via Gemini's OpenAI-compatible REST endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`). Claude (Anthropic) and other OpenAI-compatible endpoints remain valid drop-in providers.
- **Decision:** The M2 AI worker (`services/ai/`) uses the **`openai` Python SDK** pointed at `OPENAI_BASE_URL` + `OPENAI_API_KEY`. The **default provider is Google Gemini** (`gemini-2.5-flash` for vision/summary; `text-embedding-004` 768-dim for embeddings). The API key is left **blank** in `.env.example` (operator pastes their key). All provider-specific state is isolated in **`services/ai/app/llm.py`** — one file to change if swapping providers. ADR-010 ("Claude for vision extraction") is **superseded for the M2 extraction/summary worker** by this decision; Claude remains the planned provider for RAG Q&A (Should-have, not yet built).
- **Consequences:** The worker starts and is code-testable with a blank key (mocked/synthetic); no key is baked in. A FreeLLMAPI-compatible endpoint is the documented fallback for development. Provider lock-in is minimal — any OpenAI-compatible endpoint works. Trade-off: Gemini vision accuracy vs Claude on complex multilingual Indian medical forms is untested at scale; the eval harness (`services/ai/eval/`) provides the measurement gate (≥90% field accuracy) before production use.
- **Revisit-when:** Eval harness shows accuracy gap on Indian-language forms; cost or residency pressure dictates a switch; or production DPA review concludes a specific provider is required.

---

## Decision dependency map
```
ADR-005 Supabase ──┬─► ADR-002 (Next+Supabase BFF) ──► ADR-001 (PWA)
                   ├─► ADR-004 (pgmq/pg_cron)  ──► ADR-008 (async pipeline)
                   ├─► ADR-019 (email OTP; supersedes ADR-007 phone OTP)
                   └─► ADR-011 (pgvector)
ADR-003 Python AI ─► ADR-008 ─► ADR-010 (Claude) ─► ADR-023 (OpenAI-SDK→Gemini default for M2 worker; supersedes ADR-010 for extraction) ─► ADR-012 (PHI residency tradeoff)
ADR-006 FHIR-aware ─► ADR-013 (defer ABDM)
ADR-020 NotificationProvider (Mock + Telegram; supersedes ADR-014 WhatsApp)   ADR-015 i18n   ADR-017 Razorpay (test mode)   ADR-016 monorepo   ADR-018 hosting   ADR-021 sequential migrations   ADR-022 Calm Indigo design system
```
