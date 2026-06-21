# Phase 0 — Architecture Review

> **Purpose:** Stress-test the product spec (`../README.md`) against the delivery constraints *before* a single line of production code. This document challenges assumptions, names the risks, and decides what we will deliberately *not* build for the first release.
>
> **Reviewers (roles worn):** Staff Engineer · Technical Architect · Security Engineer · Engineering Manager · Product Engineer.
>
> **Verdict in one line:** The product vision is sound and unusually well-specified. The *delivery shell* described in the README (RN/Expo mobile + NestJS gateway + Redis + live ABDM) is heavier than the constraints allow or the MVP needs. We keep 100% of the vision and ship a **leaner, web-first** version of it.

---

## 0.1 The constraint reconciliation (the one decision that shapes everything)

The README and your stated constraints disagree in a few places. They are not contradictions of *vision* — only of *delivery mechanism*. Here is every divergence and the call:

| Topic | README says | Your constraints say | **Decision** | Why |
|---|---|---|---|---|
| Client | RN/Expo mobile **primary**, web secondary | Next.js 15, web-first; "mobile later" | **Next.js 15 PWA, mobile-responsive, installable. Web is the only client at MVP.** | One codebase, one deploy target (Vercel), instant doctor-share view, no app-store review loop. Solo-dev velocity wins. |
| Core API | NestJS (TypeScript) gateway/BFF | Supabase; "no unnecessary microservices" | **Delete NestJS.** Next.js Route Handlers + Server Actions are the BFF; Supabase is auth + DB + storage + RLS. | A separate Node gateway in front of Supabase is a redundant hop for a solo dev. Removed entirely. |
| AI | Python FastAPI service | "AI: Python service" | **Keep exactly one Python (FastAPI) service.** | The *only* justified service. Python earns its place: PDF→image, OpenCV preprocessing, embeddings, FHIR/LOINC libs. |
| Queue/cache | Redis (jobs, reminders, cache) | (none) | **Delete Redis.** Use a Postgres-backed job queue (Supabase Queues / `pgmq`) + `pg_cron` for reminders. | Removes a whole stateful service. Postgres already does this well at our volume. |
| ABDM/ABHA | Sandbox M1+M3 in Month 4 | (not in constraints) | **Defer all live ABDM to Post-MVP.** Keep the data model FHIR-*aware*. | The README itself names ABDM as the #1 thing to cut. Sandbox sign-off is a time sink for a solo dev. |
| Notifications | FCM push + WhatsApp | Vercel/web | **WhatsApp is the primary nudge channel; web-push is best-effort.** | Sidesteps the weakest part of PWAs (iOS push) by leaning on the channel the README already wants. |
| Data residency | "S3-compatible, India region" | Supabase | **Supabase region `ap-south-1` (Mumbai).** Storage + DB in-region. | DPDP residency expectation, low latency for Indian users. |

**Net effect:** we *delete* two infrastructure components (NestJS, Redis) and one client platform (native mobile) versus the README. This is **less** architecture, not more — squarely inside the README's own "don't over-engineer; map to FHIR at the boundaries, don't FHIR your whole DB" guidance.

```
README target:  [RN app] + [Next web] → [NestJS BFF] → [Py AI] [ABDM svc] [Notif svc] → [PG][S3][Redis]
MVP target:     [Next.js 15 PWA] ──┬─► [Supabase: Auth · Postgres+pgvector · Storage · RLS · pg_cron]
                                   └─► [Python FastAPI: OCR · extract · embed · RAG]
                                          ↑ jobs via Supabase Queues (pgmq)
```

---

## 0.2 Assumptions challenged

Each assumption below is stated, then pressure-tested. "Hold" = we accept it. "Revise" = we change it. "Watch" = accept but monitor.

1. **"India is mobile-first, therefore the app must be native mobile."** → **Revise.** India is mobile-first, but a *mobile-responsive PWA opened from a WhatsApp link* meets the same user on the same device without an app-store install — which is itself friction for Tier-2/3. The genuine native-only needs (high-quality document camera, reliable background push) are addressable: the browser camera is adequate for document capture, and WhatsApp carries the notifications. **Native is a Post-MVP channel, not a Day-1 requirement.**

2. **"WhatsApp capture is core to the MVP loop."** → **Revise to Should-have.** It is the most *delightful* capture path, but it depends on Meta Business verification + WhatsApp Cloud API number + template approval — an external, multi-week, approval-gated dependency a solo dev cannot fully control. The in-app camera delivers the identical end value (photo → AI → filed). **MVP must = in-app capture. WhatsApp capture is a fast-follow the moment Meta approval lands.** We must not let an external approval queue block the launch.

3. **"AI Q&A (RAG) is an MVP feature."** → **Revise to Should-have.** It is a great demo and differentiator, but the README itself lists Q&A as a cut-line. The wedge users (chronic-illness/elder caregivers) get their core value from *timeline + trends + reminders + share*. Q&A ships the moment the spine is stable. Embeddings are written from Day 1 (cheap) so Q&A is a thin add later.

4. **"Vernacular = Hindi + 2 regional languages at launch."** → **Revise.** i18n *scaffolding* is a Day-1 must (retrofitting it is painful). Shipping *content* in 3+ languages with live Bhashini translation of AI output is scope. **MVP launches English + Hindi UI; elder mode (large-font/high-contrast) in; 2 regional languages + dynamic AI translation are Should/Nice.** This honors principle #3 without a translation-pipeline rabbit hole.

5. **"Offline-tolerant with queued uploads and sync."** → **Revise to online-first + resilient.** Full offline sync (conflict resolution, background queue) is a multi-week effort. MVP target: graceful failure, optimistic UI, automatic retry on flaky connections, PWA shell caching. **True offline sync is Post-MVP.**

6. **"A user belongs to multiple families with roles + per-member scope."** → **Revise to single-owner families for MVP.** Multi-family membership with `member_scope` RBAC is the single biggest source of accidental complexity in the schema and RLS. The genuine need — an NRI sibling seeing a parent's record — is served at MVP by **scoped share links**, with full **co-caregiver invites as the first post-launch feature.** (See §0.5.)

7. **"Envelope encryption with per-object keys + app-layer field-level encryption."** → **Revise (this is the security-honesty call, see §0.4).** For a solo-dev MVP on Supabase, hand-rolled per-object envelope keys fight the platform (signed URLs, RLS) and add a key-management surface that is *more* likely to cause an outage or a lockout than to stop a breach. **MVP relies on: Supabase at-rest AES-256 + TLS 1.2+ + strict RLS + private buckets + short-lived signed URLs + scoped revocable share tokens.** App-layer field encryption is deferred to the Significant-Data-Fiduciary threshold and documented as a conscious tradeoff.

8. **"Handwritten prescriptions get OCR'd."** → **Hold, with expectation-setting.** The README already de-risks this correctly: start with typed lab reports + discharge summaries, treat handwriting as best-effort + human-in-the-loop. We keep that exactly. **Do not market handwriting accuracy.**

9. **"4 months, solo dev."** → **Watch.** Achievable *for the revised MVP* (see timeline in §0.6 and `Milestones.md`). Achievable for the *README-literal* MVP (native + NestJS + Redis + WhatsApp + Q&A + 3 languages + ABDM sandbox) — no. The cuts above are what make 4 months real.

---

## 0.3 Risk register (Phase-0 view; full register in `Risks.md`)

### Technical risks
- **T1 — Extraction accuracy on messy Indian documents.** The entire value prop hinges on OCR→structure quality. *Mitigation:* vision-LLM with a strict JSON schema; confidence scoring; human-in-the-loop review card; start with typed docs. Build an **eval set of ~50 real reports** before trusting the pipeline.
- **T2 — Long-running AI calls vs serverless timeouts.** Vision extraction can take 10–60s; Vercel/serverless functions time out. *Mitigation:* async by design — upload returns immediately, a Postgres job row drives the Python worker, UI polls/subscribes for status. Never do extraction inline in a request.
- **T3 — Python service hosting.** Vercel is for Next.js; the Python worker needs a home. *Mitigation:* a single small container on Render/Railway/Fly (decision pending, §0.5). Keep it stateless; all state in Postgres.
- **T4 — RLS correctness.** One missing policy = cross-family PHI leak, and the KPI for that is *zero*. *Mitigation:* RLS on every table from migration #1; an automated test suite that asserts family-A cannot read family-B; default-deny.
- **T5 — PHI leaving the India region to the LLM provider.** Sending documents/text to Claude's API moves health data out of region. *Mitigation:* DPA with zero-retention/no-training terms; send the **minimum** needed; redact obvious direct identifiers where feasible; document this flow in the DPDP record of processing. **This is a genuine compliance decision, not a footnote** (see `security/Security-Plan.md`).

### Scope risks
- **S1 — Feature breadth.** The README lists ~12 MVP features; several are cut-lines. *Mitigation:* the Must/Should/Nice contract in `MVP.md`; protect the spine (§0.7).
- **S2 — External approval dependencies on the critical path** (WhatsApp Cloud API, SMS DLT registration, Razorpay KYC). *Mitigation:* start every approval process in Week 1, but **never let any of them block launch** — each has an in-app fallback.
- **S3 — ABDM gravity.** ABDM is fascinating and resume-gold; it is also a swamp. *Mitigation:* hard-defer to Post-MVP; FHIR-aware schema only.

### Security & compliance risks
- **C1 — Public doctor-share view renders PHI without login.** *Mitigation:* 128-bit unguessable tokens, server-side expiry + revocation, `noindex`, scoped to chosen member/type/date range, every access logged. (See `security/Security-Plan.md`.)
- **C2 — DPDP consent + erasure must be first-class**, not bolted on. *Mitigation:* consent dashboard, immutable audit log, and a real "export & delete" path are MVP Must-haves.
- **C3 — SMS OTP in India needs DLT template registration** (TRAI) via the SMS provider; this gates phone-OTP login. *Mitigation:* register Week 1; provider = MSG91 or Twilio; (see §0.5).

### MVP risks (the "will this actually ship" risks)
- **M1 — Gold-plating the AI before the vault is usable.** *Mitigation:* Month 1 ships a *manual* vault (upload + view + structured-by-hand) that is valuable with zero AI. AI augments it in Month 2.
- **M2 — Encryption/over-compliance perfectionism stalling the build.** *Mitigation:* the §0.4 baseline is DPDP-defensible and shippable; harden later.
- **M3 — Solo-dev burnout from breadth.** *Mitigation:* weekly demoable milestones; ruthless cut-lines.

### Over-engineering risks (things the spec invites that we will NOT do at MVP)
- NestJS gateway · Redis · per-object envelope encryption · multi-family RBAC with member-scope · full offline sync · live ABDM · 3+ languages with live translation · FHIR as the internal storage model · microservices for notifications/ABDM. **All deferred or deleted.** Each is justified in `Decisions.md`.

---

## 0.4 The security-honesty tradeoff (stated plainly)

We are deliberately **not** building app-layer field-level encryption or per-object envelope keys for the MVP. A reader should understand exactly what that does and does not buy:

- **What we still have (strong):** TLS in transit; AES-256 at rest (Supabase/storage); strict default-deny RLS so no family can read another's rows; private storage buckets reachable only via short-lived signed URLs; scoped, revocable, logged share tokens; India-region residency; immutable audit log.
- **What we are deferring (defense-in-depth):** encryption *under* the database/storage layer such that a Supabase-level compromise or an over-privileged service key still cannot read plaintext PHI.
- **Why defer:** for a solo dev, a bespoke KMS/envelope scheme is a larger *availability* and *lockout* risk than the breach it defends against, and it conflicts with signed-URL document delivery and RAG. The baseline above already meets the DPDP **reasonable security safeguards** bar for launch.
- **Trigger to revisit:** before crossing into Significant-Data-Fiduciary territory, before any B2B2C data-sharing, or before the first audit — whichever comes first. Tracked in `Risks.md` and `Decisions.md` (ADR-012).

This is the kind of decision that must be *written down and owned*, not silently made. It is.

---

## 0.5 Missing decisions (resolved here with recommended defaults)

The README's §24 "Open decisions" plus gaps this review found. Each gets a **recommended default** so the plan is unblocked; final calls live in `Decisions.md`.

| # | Decision | Recommended default | Notes |
|---|---|---|---|
| D1 | Client platform | **Next.js 15 PWA (web-first)** | Per constraints. Native is Post-MVP. |
| D2 | Python service hosting | **Single container on Render (or Railway/Fly)** | Avoid serverless timeouts; stateless; cheap. |
| D3 | Async job mechanism | **Supabase Queues (`pgmq`) + `pg_cron`** | No Redis. |
| D4 | SMS OTP provider | **MSG91** (India-native, DLT-friendly) | Twilio fallback. Start DLT registration Week 1. |
| D5 | LLM/vision model | **Claude** — smaller model for high-volume extraction, larger for RAG/summaries | Per README; set a per-record cost ceiling. |
| D6 | Storage residency | **Supabase `ap-south-1` (Mumbai)** | DPDP residency. |
| D7 | MVP languages | **English + Hindi**; elder mode in | Regional langs Should/Nice; pick by launch geography. |
| D8 | Hero wedge | **Elderly-parent caregivers** (Priya/Arjun) | Sharpest pain + retention; chronic-illness is the same motion. |
| D9 | Co-caregiver access | **MVP: share links.** Co-caregiver invites = first post-launch feature. | Serves the NRI persona without multi-family RBAC at launch. |
| D10 | Payments | **Razorpay** (UPI + cards + international) | Start KYC early; gating logic Month 4. |
| D11 | Name/domain/trademark | **Verify `SehatVault` availability before public launch** | Out-of-band task; fallbacks in README §24. |

None of these block planning. Several (D4 DLT, D10 KYC, WhatsApp approval) are **long-lead admin tasks** that should start in parallel with Week-1 engineering.

---

## 0.6 Simplifications adopted (and what we keep)

**Simplified / deferred:**
- One client (PWA), zero gateway, zero Redis, one AI service.
- Single-owner families at MVP; share-links cover cross-caregiver needs.
- Relational data model that *maps to* FHIR at export/ABDM boundaries — not FHIR-native storage.
- Baseline encryption (no envelope/field-level at MVP).
- English + Hindi at launch.
- Reminders/notifications via WhatsApp + best-effort web-push (no FCM/native push service).

**Kept whole (the vision is intact):**
- Family-first model (members as profiles under one account).
- One-tap capture → AI auto-organise → readable timeline.
- Lab-value trends (the "active, not passive" wedge).
- Medicine list + reminders.
- Scoped, time-limited, logged doctor share (QR + link).
- DPDP consent dashboard + audit + export/delete.
- FHIR-aware schema; pgvector embeddings written from Day 1.

---

## 0.7 What we protect (the non-negotiable MVP spine)

If everything else slips, these ship — in this order of defense:

1. **Auth + family/member profiles + RLS isolation.** (Trust foundation.)
2. **Capture + encrypted storage + record view.** (The vault is useful manually.)
3. **AI auto-organise → structured timeline.** (The "aha.")
4. **Lab-value trends.** (The retention hook for chronic-illness/elder care.)
5. **Doctor share (scoped, expiring, logged).** (The viral + clinical-value surface.)
6. **Reminders (meds/appointments).** (Active management.)
7. **Consent dashboard + audit + export/delete.** (DPDP, non-negotiable.)

Everything else — WhatsApp capture, RAG Q&A, regional languages, ABDM, billing — is upside layered on a spine that already delivers value.

---

## 0.8 Confidence & hand-off

- **Architecture confidence:** **8.5 / 10** for the revised, web-first MVP. The pivot removes the riskiest moving parts (native build chain, gateway, Redis, ABDM) and concentrates risk where it belongs: extraction quality and RLS correctness — both testable.
- **Biggest residual risks:** extraction accuracy (T1), RLS correctness (T4), PHI-to-LLM residency (T5), external approval lead times (S2).
- **Realistic for a solo dev?** **Yes — for the scope in `MVP.md`.** Not for the README-literal scope. The difference is this document.

Proceed to `MVP.md` → `Scope.md` → `Decisions.md` → `Milestones.md` → `Risks.md`, then the engineering, database, API, security, and UX plans. **No production code until the final recommendation in `tasks/Backlog.md` is signed off.**
