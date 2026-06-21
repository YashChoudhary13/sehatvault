# Engineering Backlog + Final Recommendation

> Epics → stories → tasks, with effort and dependencies — detailed enough to start coding. Effort: **XS** ≤2h · **S** ≤1d · **M** 2–3d · **L** 4–5d. Task IDs `E#.S#.T#`. Traces to `../docs/MVP.md` (M-/S- IDs) and `../roadmap/Sprints.md`. **No code begins until the Final Recommendation (§ bottom) is signed off.**

---

## E1 — Foundations & Auth  *(Sprint 1–2)*
- **S1.1 Monorepo & CI**
  - T1 Init Turborepo+pnpm, `apps/web` (Next 15, TS, Tailwind, shadcn) — **M** — dep: none
  - T2 `packages/{config,ui,i18n,core,db}` skeletons — **S** — dep: T1
  - T3 GitHub Actions CI (lint/typecheck/test/build) + Sentry + `.env.example` — **M** — dep: T1
  - T4 Supabase project `ap-south-1` + migration tooling + local stack — **S** — dep: none
- **S1.2 Auth & first RLS**
  - T5 Phone-OTP (Supabase+MSG91), login screen, session middleware — **L** — dep: T4
  - T6 Migration `app_user/family/member_profile` + `auth_family_ids()` + RLS — **M** — dep: T4
  - T7 **RLS isolation test suite** in CI (family A vs B) — **M** — dep: T6 *(gate)*
  - T8 App-lock PIN (argon2) + i18n en/hi wiring — **S** — dep: T5
  - T9 **(admin)** start DLT, WhatsApp, Razorpay KYC, domain/trademark — **S** — dep: none

## E2 — Family & Members  *(Sprint 3)*
- **S2.1 Shell & navigation**
  - T1 App shell, bottom-tab nav, desktop rail — **M** — dep: E1.S1.2
  - T2 Home/family switcher + MemberCard + status glance — **M** — dep: T1
- **S2.2 Member CRUD**
  - T3 Member create/edit forms (profile, allergies, conditions, emergency) — **M** — dep: T1
  - T4 Member delete (cascade + audit log) + EmptyState set — **S** — dep: T3

## E3 — Capture & Storage  *(Sprint 4–6)*
- **S3.1 Capture & upload**
  - T1 CaptureSheet (camera/gallery/PDF, multi-page) — **M** — dep: E2
  - T2 Private `documents` bucket + storage RLS + key layout — **S** — dep: E1.S1.2
  - T3 `POST /records/ingest` → store + `health_record(pending)` + idempotency — **M** — dep: T1,T2
  - T4 Signed-URL viewer + **403-without-auth test** — **S** — dep: T2
- **S3.2 Records & manual entry**
  - T5 Record list (timeline) + detail (doc viewer) — **M** — dep: T3
  - T6 Manual structured entry/edit + record delete — **M** — dep: T5
  - T7 Timeline grouping/filter (type/date) — **S** — dep: T5
  - T8 PWA manifest + service worker + upload retry/offline banner — **M** — dep: T5

## E4 — AI Pipeline  *(Sprint 7–10)*
- **S4.1 Worker infra**
  - T1 `services/ai` FastAPI + Dockerfile + Render deploy — **M** — dep: E1
  - T2 `pgmq` enqueue on ingest + worker consume loop (idempotent) — **M** — dep: T1,E3.S3.1
  - T3 `POST /api/ai/callback` (HMAC) → upsert child rows — **M** — dep: T2
- **S4.2 Extraction & structure**
  - T4 Vision-LLM extract → strict JSON (pydantic) + classify — **L** — dep: T2
  - T5 **Golden eval harness** (~50 labelled docs) + accuracy report — **L** — dep: T4 *(gate T1)*
  - T6 `lab_catalog` seed + normalise (canonical/LOINC/units) — **M** — dep: T4
  - T7 Medicine parsing from prescriptions — **M** — dep: T4
- **S4.3 Trends, review, embeddings**
  - T8 TrendChart + trends API + direction heuristic — **M** — dep: T6
  - T9 ReviewCard (low-confidence correction) — **M** — dep: T4
  - T10 Chunk→embed→`pgvector` + summaries (en/hi) + cost logging — **M** — dep: T4

## E5 — Doctor Share  *(Sprint 11)*  *(security-critical)*
- T1 Create-share UI (scope+expiry) + ShareScopeForm — **M** — dep: E4.S4.3
- T2 128-bit token, hash-at-rest, `share_grant` migration — **S** — dep: E1
- T3 Public `/s/:token` summary render + signed-doc gating — **M** — dep: T2
- T4 Access logging + revoke + `noindex` + kill-switch — **S** — dep: T3
- T5 QRCard + security review (C1) — **S** — dep: T3

## E6 — Reminders  *(Sprint 12)*
- T1 `reminder` migration + create/edit UI — **S** — dep: E4
- T2 `pg_cron` → `/api/cron/reminders` dispatcher — **M** — dep: T1
- T3 Web-push + in-app delivery + Taken/Skip — **M** — dep: T2
- T4 Refill hint (Should) — **S** — dep: T3

## E7 — Vernacular & Elder Mode  *(Sprint 13)*
- T1 Complete Hindi catalog (native review) — **M** — dep: E1
- T2 ElderModeProvider theme (type/contrast/targets) — **M** — dep: E2
- T3 a11y pass (axe) on core screens — **S** — dep: T2

## E8 — Consent, Audit, Export/Delete  *(Sprint 14)*  *(DPDP, launch-blocking)*
- T1 Consent dashboard (shares + access log views) — **M** — dep: E5,E6
- T2 Export job (zip docs+JSON) + download — **M** — dep: E3,E4
- T3 Delete account (cascade + storage purge + tombstone) — **M** — dep: T2
- T4 DPDP acceptance tests (export complete, delete purges) — **S** — dep: T2,T3 *(gate C2)*

## E9 — Hardening & Billing (Should)  *(Sprint 15)*
- T1 Security pass: CSP, key-leak build check, rate limits — **M** — dep: all
- T2 Onboarding/empty/error/offline polish — **M** — dep: all
- T3 Razorpay Free/Plus gating + webhook (Should) — **L** — dep: E1.S1.2
- T4 Emergency card (Should) — **S** — dep: E2

## E10 — WhatsApp & Q&A (Should)  *(Sprint 13/parallel)*
- T1 WhatsApp inbound webhook → ingest (post Meta approval) — **L** — dep: E3,E4 + admin
- T2 WhatsApp reminder delivery channel — **M** — dep: E6
- T3 AI Q&A (RAG) UI over `pgvector` + citations + disclaimer — **L** — dep: E4.S4.3

## E11 — Beta & Ops  *(Sprint 16)*
- T1 Analytics instrumentation (activation, retention, correction rate) — **M** — dep: all
- T2 Final acceptance-gate run (6 gates) — **S** — dep: all *(launch gate)*
- T3 Beta onboarding (20–50 families) + feedback loop — **M** — dep: T2
- T4 **(stretch)** ABDM sandbox M1+M3 demo — **L** — dep: E4

---

## Critical path (what gates what)
```
E1(auth+RLS) ─► E2 ─► E3(capture) ─► E4(AI) ─► E5(share) ─► E8(DPDP) ─► E11(beta)
                                  └► E6(reminders) ┘
Should/parallel: E7 vernacular · E9 hardening/billing · E10 WhatsApp/Q&A
Hard gates: E1.T7 (RLS) · E4.T5 (eval) · E8.T4 (DPDP) · E11.T2 (acceptance)
```

## Effort roll-up (rough)
~ E1:9d · E2:6d · E3:11d · E4:18d · E5:6d · E6:7d · E7:6d · E8:9d · E9:11d(Should) · E10:13d(Should) · E11:9d.
**Spine (E1–E8,E11) ≈ 75 dev-days ≈ 15 weeks.** Should layer (E9–E10) adds ~5 weeks if all pulled in.

---

# FINAL RECOMMENDATION

### 1. Architecture confidence
**8.5 / 10** for the revised **web-first** MVP. Confidence comes from deleting the riskiest moving parts (native build chain, NestJS gateway, Redis, live ABDM) and concentrating remaining risk in two *testable* places — extraction accuracy and RLS isolation. It is not a 10 because of two genuine unknowns: real-world extraction quality on messy Indian documents (T1) and the PHI-to-LLM residency posture (T5).

### 2. Biggest technical risks
1. **Extraction accuracy (T1)** — the value prop; de-risked by typed-first + confidence + human-in-the-loop + a golden eval set that must pass before launch.
2. **RLS correctness (T4)** — one bug = cross-family PHI leak; the KPI is zero. Default-deny + a CI isolation suite is the answer; established in Sprint 2 before any PHI exists.
3. **PHI residency to the LLM (T5)** — needs a DPA + minimisation + single egress point; documented and owned, not hidden.
4. **External approval lead times (S2)** — DLT/WhatsApp/Razorpay; all started Week 1, all off the critical path except OTP (which has fallbacks).

### 3. Recommended MVP scope
Ship the **7-part spine** only: auth + family/RLS · capture + encrypted storage · AI auto-organise → timeline · lab trends · scoped/expiring/logged doctor share · medicine + appointment reminders · DPDP consent/audit/export/delete — in **English + Hindi** with **elder mode**. Treat **WhatsApp, AI Q&A, billing, regional languages, ABDM, native mobile** as SHOULD/POST — valuable, but each is a layer on a spine that already delivers value and never a launch blocker.

### 4. Estimated development timeline
- **Aggressive (README target):** 16 weeks (4 months), zero slack, spine + light Should.
- **Realistic (recommended plan of record):** **~18–20 weeks (4.5–5 months)** including ~2–3 weeks buffer for T1 iteration, approvals, and the inevitable. Beta-ready at the end; public launch follows Phase-2 (ABDM, co-caregivers, WhatsApp GA).

### 5. Is this realistic for a solo developer?
**Yes — for the scope above.** The pivot to web-first + Supabase + one Python service + no Redis/gateway is precisely what makes it solo-tractable; the README's literal stack (native + microservices + live ABDM + 3 languages) is **not** a solo 4-month build. Caveats: the developer must be a strong full-stack TS engineer comfortable with Postgres/RLS and enough Python for an LLM pipeline; vernacular needs a native Hindi reviewer; and the eval-driven discipline on extraction is non-optional. With the cut levers pre-agreed (`../docs/Scope.md §4`), the plan degrades gracefully rather than failing.

---

## Sign-off
- [ ] Architecture pivot (web-first, Supabase, one AI service, no gateway/Redis, defer ABDM) **approved**
- [ ] MVP scope (the 7-part spine; WhatsApp/Q&A/billing/ABDM = Should/Post) **approved**
- [ ] Security tradeoff ADR-012 (baseline encryption now, field-level later) **approved**
- [ ] Timeline expectation (~18–20 weeks realistic) **approved**

**On sign-off, implementation begins at `../roadmap/Sprints.md` → Sprint 1.** Until then, this remains a planning workspace with no production code.
