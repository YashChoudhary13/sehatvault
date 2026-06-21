# Decisions.md — Architecture Decision Records (ADRs)

> Every non-trivial decision, why it was made, and what would make us revisit it. Format per ADR: **Status · Context · Decision · Consequences · Revisit-when.** Status ∈ {Accepted, Accepted (MVP), Deferred, Proposed}.
>
> These ADRs operationalise `Phase0-Architecture-Review.md`. Where the README and the constraints conflicted, the ADR records the resolution.

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
- **Decision:** **Supabase** project in **`ap-south-1`**. Postgres (+ `pgvector`, `pgmq`, `pg_cron`), Supabase Auth (phone OTP), Storage (private buckets), RLS.
- **Consequences:** One console, one bill, generous free tier, residency satisfied. Lock-in risk mitigated by standard Postgres + S3-compatible storage (portable).
- **Revisit-when:** Scale/cost or compliance demands self-managed Postgres on AWS Mumbai (README's stated scale target).

### ADR-006 — Relational model, FHIR-aware at the boundaries (not FHIR-native storage)
- **Status:** Accepted
- **Context:** README explicitly warns against FHIR-ing the whole DB.
- **Decision:** Internal schema is plain relational; map to **FHIR R4** only at export/ABDM boundaries. Keep FHIR-friendly fields (LOINC on observations, standard codes where known).
- **Consequences:** Simple queries, fast iteration; FHIR mapping is a thin adapter when ABDM arrives.
- **Revisit-when:** Never expected to flip; ABDM consumes the mapping layer.

### ADR-007 — Phone-OTP auth via MSG91 (Supabase Auth); app-lock PIN
- **Status:** Accepted (MVP)
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
- **Revisit-when:** Cost or residency pressure → evaluate an in-region/self-hosted model for extraction.

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
- **Status:** Accepted (MVP) for *reminders channel*; Should-have for *capture*
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
- **Decision:** **Razorpay** (Cashfree fallback). Free/Plus gating at the app layer. Start KYC early; launch can be free.
- **Consequences:** Indian + diaspora monetisation; paywall is a fast-follow, not a blocker.
- **Revisit-when:** International-card economics or NRI billing UX demand a dedicated processor.

### ADR-018 — Python AI service hosted as a single container (Render)
- **Status:** Accepted (MVP)
- **Context:** Vercel hosts Next.js; long-running vision calls don't fit serverless timeouts well (T2/T3).
- **Decision:** Deploy the FastAPI worker as **one small container on Render** (Railway/Fly equivalent). It pulls jobs from `pgmq`, writes results to Postgres/Storage.
- **Consequences:** No timeout constraints; cheap; stateless and horizontally scalable later.
- **Revisit-when:** Volume warrants autoscaling/GPU or moving to AWS Mumbai with the DB.

---

## Decision dependency map
```
ADR-005 Supabase ──┬─► ADR-002 (Next+Supabase BFF) ──► ADR-001 (PWA)
                   ├─► ADR-004 (pgmq/pg_cron)  ──► ADR-008 (async pipeline)
                   ├─► ADR-007 (phone OTP)
                   └─► ADR-011 (pgvector)
ADR-003 Python AI ─► ADR-008 ─► ADR-010 (Claude) ─► ADR-012 (PHI residency tradeoff)
ADR-006 FHIR-aware ─► ADR-013 (defer ABDM)
ADR-014 WhatsApp (off critical path)   ADR-015 i18n   ADR-017 Razorpay   ADR-016 monorepo   ADR-018 hosting
```
