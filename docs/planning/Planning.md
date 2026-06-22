# SehatVault — Planning

> Single source of truth for **scope, milestones, roadmap, sprints, and backlog**. Merged from the former
> `MVP.md`, `Scope.md`, `Milestones.md`, `Roadmap.md`, `Sprints.md`, `Backlog.md` and updated to current
> reality. Live execution status lives in [`../progress.md`](../progress.md); decisions in
> [`../Decisions.md`](../Decisions.md).

> **Related docs:** [Decisions](../Decisions.md) · [Engineering-Plan](../architecture/Engineering-Plan.md) · [Schema](../database/Schema.md) · [API-Spec](../api/API-Spec.md) · [Security-Plan](../security/Security-Plan.md) · [Progress](../progress.md)

## Current reality (the ground truth all planning aligns to)
- **Auth:** Supabase **Email OTP** (no SMS/phone OTP) — ADR-019.
- **DB:** Supabase **Postgres 17**, sequential migrations (`0001`, `0002`, …) — ADR-021.
- **Notifications:** **NotificationProvider** abstraction — **Telegram** (real, opt-in) + **Mock** (in-app default) — ADR-020.
- **Payments:** **Razorpay test mode** only — ADR-017.
- **Deferred / future production:** SMS/DLT, WhatsApp Business, Razorpay production KYC, live ABDM, native mobile, AI Q&A (RAG), regional languages.
- **AI/LLM:** introduced at **M2**, synthetic/de-identified data in dev; **PHI/DPA is a production-only** concern.

---

## 1. Scope contract (Must / Should / Nice / Post)

**MVP definition:** a web-first (Next.js 15 PWA), DPDP-compliant family health-record vault where a caregiver
adds a member's documents, AI auto-organises them into a timeline with lab-value trends, sets medicine/appointment
reminders, and shares a scoped, expiring, audit-logged summary with a doctor.

### MUST (v1.0 spine — never cut)
- **M-01** Email-OTP signup/login (Supabase Auth) + app-lock PIN.
- **M-02** Create a family (single owner) on first run.
- **M-03** Add/edit member profiles (name, relationship, DOB, sex, blood group, allergies[], chronic conditions[], emergency contact).
- **M-04** Row-Level Security isolating every family's data; default-deny; CI cross-family leak tests.
- **M-05** One-tap capture: camera, gallery, PDF (multi-page).
- **M-06** Encrypted document storage (private bucket, signed URLs, `ap-south-1`).
- **M-07** Record list + detail (view original immediately, regardless of AI status).
- **M-08** Manual structured entry/edit (vault useful with zero AI).
- **M-09** Async vision-LLM extraction → strict JSON (type, date, facility, doctor, observations[], medications[]).
- **M-10** Record-type classification.
- **M-11** Confidence + human-in-the-loop review card; user edits are source of truth.
- **M-12** Lab-value normalisation (canonical + LOINC) for trend grouping.
- **M-13** Per-member timeline (filter by type/date).
- **M-14** Lab-value trends (HbA1c, fasting glucose, BP, TSH, creatinine, Hb) with normal-range banding.
- **M-15** Medicine list parsed from prescriptions.
- **M-16** Reminders (meds + appointments) via the **NotificationProvider** — Mock in-app (default) + Telegram (opt-in); "Taken/Skip" logging.
- **M-17** Doctor share: scoped, time-limited, revocable link + QR; public read-only summary; every access logged.
- **M-18** Consent dashboard: list/revoke every share + access.
- **M-19** Immutable audit log of access per member.
- **M-20** Export my data + delete account/data (first-class).
- **M-21** i18n scaffolding + English + Hindi UI; elder mode (large font / high contrast).

### SHOULD (first cut-line)
- **S-01** Telegram notifications GA (the real MVP notification channel; opt-in).
- **S-02** AI Q&A (RAG) over a family's records, with citations + "not medical advice" (embeddings written from Day 1).
- **S-03** Refill prediction.
- **S-04** Razorpay **test-mode** Free/Plus gating (launch free; production keys/KYC are future).
- **S-05** Emergency card (blood group, allergies, conditions, current meds, emergency contact QR).

### NICE (only if ahead)
- **N-01** Two regional languages + dynamic AI-output translation (Bhashini).
- **N-02** Drug-interaction / duplicate-test soft warnings.
- **N-03** Child growth charts + immunisation scheduler.
- **N-04** Co-caregiver invite (second user, viewer role).

### POST-MVP (explicitly out)
- **P-01** Live ABDM/ABHA (ABHA create/verify + HIU consent + FHIR fetch).
- **P-02** Lab/diagnostic HIP push.
- **P-03** Native mobile (RN/Expo or Flutter).
- **P-04** Full offline sync.
- **P-05** App-layer field-level / envelope encryption (SDF trigger — ADR-012).
- **P-06** Multi-family RBAC + member scope.
- **P-07** **SMS OTP / DLT**, **WhatsApp** capture + WhatsAppProvider, **SMSProvider**.
- **P-08** Doctor-side companion; B2B2C (labs/insurers/pharmacies/eldercare).

---

## 2. Boundaries & assumptions

**In scope:** responsive web PWA; email-OTP auth; single-owner family; in-app capture; vision-LLM extraction;
timeline/trends/medicines; NotificationProvider (Mock+Telegram); scoped doctor share; DPDP consent/audit/export/delete;
en+hi + elder mode; Razorpay test-mode gating.

**Out of scope (v1.0):** native app, offline-first sync, multi-family RBAC, doctor accounts, live ABDM, B2B2C,
SMS/WhatsApp channels, envelope/field encryption, formal DPIA/SDF apparatus.

**Assumptions:** modern mobile browser; recruited closed beta (~20–50 families); typed docs are the primary
extraction target (handwriting best-effort); single caregiver per family (cross-caregiver via share links);
intermittent-but-present connectivity; en+hi cover the first geography; **dev/test uses synthetic/de-identified
data so the LLM DPA is a production-only gate**.

---

## 3. Milestones (outcome gates)

| Milestone | Outcome | Exit gate |
|---|---|---|
| **M0 — Foundations** (Wk 0–2) | Correct skeleton: repo, CI, Supabase, design system, **email-OTP** login, RLS-isolated `member_profile`. ✅ **Done (PR1 + Sprint 2 in progress)** | New email signs in + creates family+member; RLS test proves family-B can't read family-A; CI green. |
| **M1 — Manual vault** (Wk 3–6) | Store/view real documents securely — valuable with zero AI. | Upload 3-page PDF → stored, listed, opens via signed URL; direct URL 403s; manual entry → timeline. |
| **M2 — AI auto-organise** (Wk 7–10) | Snap a report → structured data, trends, medicines. | Typed lab → observations + auto-chart; prescription → meds; low-confidence → review card; eval bar met. |
| **M3 — Use & reach** (Wk 11–13) | Active + shareable: doctor share, reminders, vernacular. | Scoped share expires/revokes + logged; reminder fires via Telegram/Mock; usable in Hindi + elder mode. |
| **M4 — Trust, billing & beta** (Wk 14–16) | Trustworthy, launchable. | Onboard→AI record <90s; isolation suite green; share expiry/revoke/logging; export+delete verified; 20–50 families. |

**Slip rule:** if a gate isn't green by its time-box, pull a **cut lever** (§7) — never slip the gate.

---

## 4. Phased roadmap

- **Phase 1 — MVP (Wk 1–16) → closed beta.** The spine + the Should layer if time allows (above).
- **Phase 2 — Network & depth (Mo 5–8) → public launch.** ABDM/ABHA (sandbox→prod), lab HIP push, co-caregiver invites + multi-family RBAC, **WhatsApp** capture + WhatsAppProvider, **SMS OTP/DLT** + SMSProvider, AI Q&A GA, emergency card, 2 regional languages, native-mobile evaluation, **Razorpay production KYC**.
- **Phase 3 — Scale & B2B2C (Mo 9–12+).** Lab/clinic partnerships, insurer claim bundles, pharmacy refill, eldercare bridge, drug-interaction advisories, child growth charts, **SDF readiness** (field/envelope encryption P-05, DPIA, in-India DPO), infra hardening.

---

## 5. Sprint plan (16 one-week sprints)

| Sprint | Milestone | Focus |
|---|---|---|
| 1 | M0 | Repo & rails: Turborepo/pnpm, Next 15 + Tailwind v4 + shadcn, Supabase, CI, Sentry, `.env.example`. ✅ |
| 2 | M0 | **Email-OTP** login (Supabase Auth) + middleware; `0002_family.sql` (`app_user`/`family`/`member_profile`) + `auth_family_ids()` + RLS; RLS isolation test (gate); app-lock PIN; i18n en/hi. |
| 3 | M1 | App shell + nav; Home/family switcher; member CRUD; empty states. |
| 4 | M1 | CaptureSheet (camera/gallery/PDF); private `documents` bucket + storage RLS; `/api/ingest` → `health_record(pending)`; signed-URL viewer + 403 test. |
| 5 | M1 | Record list + detail (doc viewer); manual structured entry/edit; record delete (logged). |
| 6 | M1 | Timeline grouping/filters; PWA manifest + SW; offline/upload-retry; storage 403 hardening. **M1 demo.** |
| 7 | M2 | `services/ai` FastAPI + Render; `pgmq` enqueue + worker loop; `/api/ai/callback` (HMAC); realtime status. |
| 8 | M2 | Vision-LLM extract → strict JSON (pydantic) + classify; **golden eval harness** (~50 docs) — T1 gate. |
| 9 | M2 | `lab_catalog` + normalisation; TrendChart; ReviewCard; medicine parsing. |
| 10 | M2 | Chunk→embed→pgvector; summaries (en/hi); per-record cost logging. **M2 demo.** |
| 11 | M3 | Doctor share: scope+expiry, 128-bit token (hash-at-rest), public `/s/:token`, access log, revoke, `noindex`, QR. |
| 12 | M3 | **NotificationProvider** + **MockNotificationProvider** (in-app, default) + **TelegramNotificationProvider** (+ `/api/webhooks/telegram`); reminders via `pg_cron`; notification history (channel + status); Taken/Skip; refill hint. |
| 13 | M3 | Hindi complete + elder mode; a11y (axe); **Should:** AI Q&A (RAG). **M3 demo.** |
| 14 | M4 | Consent dashboard; export (zip docs+JSON); delete account (cascade + storage purge + tombstone); DPDP acceptance tests (gate). |
| 15 | M4 | Security pass (CSP, key-leak check, rate limits); onboarding/empty/error/offline polish; **Should:** Razorpay test-mode gating; emergency card. |
| 16 | M4 | Analytics; final acceptance-gate run; **20–50 family** beta. |

> Honest estimate: ~18–20 weeks incl. buffer for T1 iteration and the inevitable.

---

## 6. Backlog (epics → key stories)

- **E1 Foundations & Auth** — monorepo/CI ✅; **email-OTP** + session middleware; `app_user/family/member_profile` + `auth_family_ids()` + RLS; **RLS isolation suite (gate)**; app-lock PIN.
- **E2 Family & Members** — shell/nav; Home/family switcher; member CRUD + delete (cascade + audit).
- **E3 Capture & Storage** — CaptureSheet; private bucket + storage RLS; `/records/ingest` + idempotency; signed-URL viewer + 403 test; record list/detail; manual entry; timeline filters; PWA/SW.
- **E4 AI Pipeline** — `services/ai` + Render; `pgmq` + worker; `/api/ai/callback` (HMAC); extract→JSON + classify; **golden eval (gate)**; `lab_catalog` + normalise; medicine parse; TrendChart; ReviewCard; embeddings + summaries + cost logging.
- **E5 Doctor Share** *(security-critical)* — create-share; 128-bit token hash-at-rest; public `/s/:token`; access log + revoke + `noindex` + kill-switch; QR; security review (C1).
- **E6 Reminders & Notifications** — `NotificationProvider`; **Mock** + **Telegram**; `pg_cron` → `/api/cron/reminders`; Taken/Skip; notification history (channel + status); refill hint.
- **E7 Vernacular & Elder Mode** — Hindi catalog; ElderModeProvider; a11y (axe).
- **E8 Consent/Audit/Export/Delete** *(DPDP, launch-blocking)* — consent dashboard; export job; delete cascade + purge; DPDP acceptance tests (gate C2).
- **E9 Hardening & Billing (Should)** — security pass; polish; **Razorpay test-mode** gating; emergency card.
- **E10 Q&A (Should)** — AI Q&A (RAG) over pgvector + citations.
- **E11 Beta & Ops** — analytics; acceptance-gate run; 20–50 families.

**Hard gates:** E1 RLS · E4 eval · E8 DPDP · E11 acceptance.
**Future epics (Phase 2+):** WhatsAppProvider + capture, SMSProvider + DLT, ABDM, co-caregiver RBAC, native mobile.

---

## 7. Cut levers (pull in this order if behind)

1. Drop AI Q&A (RAG) — keep embeddings, ship later.
2. Drop Razorpay gating — launch free.
3. Drop refill prediction + emergency card.
4. Reduce to English-only at launch; add Hindi within 1–2 weeks (keep i18n scaffolding + elder mode).
5. Simplify trends to one hero chart (HbA1c/sugar) — last resort.

**Never cut:** auth + RLS isolation, capture + storage, record view, manual entry, AI auto-organise, trends, doctor share, consent/audit/export/delete.

---

## 8. Pivots (major changes from the original plan)

| Was (original spec) | Now | Why / ADR |
|---|---|---|
| Phone/SMS OTP via MSG91 (TRAI **DLT**) | **Supabase Email OTP** | Removes the biggest external-approval gate; zero DLT/SMS dependency — **ADR-019** |
| WhatsApp-first notifications + capture | **NotificationProvider** abstraction: Telegram (real) + Mock (in-app) | Works with zero external approval; clean seam for SMS/WhatsApp later — **ADR-020** |
| MSG91 / DLT as active requirements | **Removed** (deferred to future production) | Not needed once auth is email-based |
| NestJS API gateway | Next.js Route Handlers + Server Actions | No redundant hop — **ADR-002** |
| Redis (jobs/cache) | **pgmq + pg_cron** | One fewer stateful service — **ADR-004** |
| RN/Expo native primary | **Next.js 15 web-first PWA** | Solo-dev velocity; native is Phase 2 — **ADR-001** |
| Razorpay live + KYC at MVP | **Razorpay test mode** only | KYC + live keys deferred to production — **ADR-017** |
| Timestamp migrations | **Sequential** (`0001`, `0002`, …) | Predictable, matches CI + plan — **ADR-021** |
| PHI/DPA as an MVP concern | **Production-only** | Dev/test uses synthetic/de-identified data |

> The original full product spec (with the legacy delivery stack) is preserved at
> [`../history/Original-Product-Spec.md`](../history/Original-Product-Spec.md); the pivot rationale at
> [`../history/Phase0-Architecture-Review.md`](../history/Phase0-Architecture-Review.md).

## 9. TODOs (captured, not designed in this pass)
- Notification data model (a `notification` / delivery-log table + a `telegram_chat_id` on `app_user`) — design in M3, not now.
- Regional-language selection (pick 2 by beta geography).
- Eval-set sourcing (~50 de-identified typed reports) before M2 trust.
