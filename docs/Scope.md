# Scope.md — In / Out Boundaries & Cut Levers

> `MVP.md` lists *features*. This document draws the **boundaries** around them: what is explicitly in, explicitly out, the assumptions we are allowed to make, and the pre-agreed levers we pull if we fall behind. The point is to make cutting scope a **calm, pre-decided** act, not a panic.

---

## 1. In scope (v1.0)

| Area | In scope | Boundary (where it stops) |
|---|---|---|
| **Platform** | Responsive web PWA (Next.js 15), installable, mobile + desktop browsers | No native iOS/Android binary. No app-store presence. |
| **Auth** | Phone-OTP, session, app-lock PIN | No email/password, no social login, no ABHA login at MVP. |
| **Family** | One owner, many member profiles | No multi-owner, no co-caregiver invites (Should/Post), no org accounts. |
| **Capture** | In-app camera / gallery / PDF | WhatsApp capture is Should (Meta-gated). No email-in, no fax, no scanner SDK. |
| **AI** | Vision-LLM extraction + classification + lab normalisation + confidence/review | No handwriting guarantees. No diagnosis. No auto-medical-advice. |
| **Records** | Timeline, detail, trends, medicines | No clinical decision support. No drug-interaction *engine* (soft warning is Nice). |
| **Reminders** | Meds + appointments, web-push + in-app | WhatsApp delivery is Should. No SMS reminders at MVP. |
| **Share** | Scoped, expiring, revocable link + QR; public read-only summary | No doctor accounts, no two-way doctor messaging. |
| **Compliance** | Consent dashboard, audit log, export, delete, India residency, baseline encryption | No envelope/field-level encryption. No formal DPIA/SDF apparatus (designed-for, not built). |
| **Languages** | English + Hindi UI, elder mode | Regional languages + live AI translation are Nice. |
| **Payments** | (Should) Razorpay Free/Plus gate | Can launch fully free; paywall is a fast-follow. |

---

## 2. Explicitly out of scope (v1.0)

Out of scope is a feature, not a failure. Each item below is **deferred on purpose** with a home in `MVP.md` Post-MVP and `roadmap/Roadmap.md`:

- Live **ABDM/ABHA** (create, link, consent, FHIR fetch) — Phase 2; sandbox demo is a stretch.
- **Native mobile** app — Phase 2+.
- **Offline-first sync** — Phase 2+.
- **Multi-family RBAC** with per-member scope — Phase 2.
- **Doctor-side** product / verified clinician view — Phase 2+.
- **B2B2C** (labs/insurers/pharmacies/eldercare) — Phase 3.
- **Lab HIP push** auto-import — Phase 2 (depends on ABDM).
- **Voice / WhatsApp assistant** — Phase 3.
- **Population-health / research** data products — Phase 3+, opt-in only.
- **Field-level/envelope encryption**, formal **DPIA**, in-India **DPO** — triggered at SDF threshold.

---

## 3. Assumptions we are allowed to make (v1.0)

These let us move fast without re-litigating each time:

1. Users are on a **modern mobile browser** (Chrome/Safari, last 2 years). We do not support legacy Android WebView quirks.
2. The first cohort is **recruited, not organic** (closed beta, ~20–50 families). We can hand-hold onboarding.
3. **Typed** lab reports / discharge summaries are the primary extraction target; handwriting is best-effort.
4. A **single caregiver per family** operates the account at MVP; cross-caregiver need is met by share links.
5. **Connectivity is intermittent but present** — we optimise for flaky, not fully offline.
6. **English + Hindi** cover the first launch geography; we pick regional languages by where the beta families are.
7. The **LLM provider's DPA** (no-train / zero-retention) is acceptable for processing minimised PHI out-of-region (tracked as risk T5).

If any assumption breaks, it becomes a decision in `Decisions.md`, not a silent scope change.

---

## 4. Cut levers (pull in this order if behind)

Pre-agreed so we never debate under pressure. Each lever protects the **spine** (Phase 0 §0.7).

1. **Drop WhatsApp** (capture + reminders) to immediately post-launch. *(Already Should; zero spine impact.)*
2. **Drop billing** — launch free, add the paywall in week 2–4. *(Already Should.)*
3. **Drop AI Q&A (RAG)** — keep embeddings writing, ship Q&A later. *(Already Should.)*
4. **Drop refill prediction + emergency card.** *(Should/Nice.)*
5. **Reduce languages** to English-only at launch, add Hindi in week 1–2. *(Keep i18n scaffolding + elder mode.)*
6. **Simplify trends** to a single hero chart (HbA1c/sugar) instead of the full panel. *(Last resort — trends are a wedge.)*

**Never cut:** auth + RLS isolation, capture + storage, record view, manual entry, consent/audit/export/delete. These are the trust and value floor.

---

## 5. Scope change control

- A new feature request during the build is logged, then triaged into Must/Should/Nice/Post **only at a milestone boundary** — not mid-sprint.
- Moving anything **into Must** requires moving something else **out** (fixed-capacity rule for a solo dev).
- The README vision is fixed; only delivery details flex (per Phase 0). A change to *vision* requires an explicit ADR in `Decisions.md`.
