# Risks.md — Risk Register

> Live register. Each risk: **ID · category · likelihood × impact · owner (role hat) · mitigation · early-warning · contingency.** For a solo dev, "owner" is the role you wear when you act on it. Sorted by exposure (likelihood × impact). Extends `Phase0-Architecture-Review.md §0.3` and README §22.
>
> Scale: L/M/H. **Exposure** = rough product of the two.

---

## Top exposure (watch weekly)

### T1 — Extraction accuracy on messy Indian documents · Technical · **H × H = critical**
- **Owner:** Product Engineer / ML.
- **Why it matters:** the entire value prop is "AI reads your report." Bad extraction = broken trust on day one.
- **Mitigation:** vision-LLM + **strict JSON schema**; per-field **confidence**; **human-in-the-loop** review card; start with **typed** lab reports + discharge summaries; handwriting = best-effort + correction. Build a **golden eval set** (below) before trusting the pipeline.
- **Early-warning:** % of records routed to review trends up; user-correction rate on a field exceeds threshold.
- **Contingency:** fall back to manual entry (always available, `M-08`); narrow accepted document types; tighten the schema/prompt; add a Document-AI fallback for clean typed docs.
- **Eval set (definition of "the bar"):** ~50 real, de-identified reports (typed lab panels, discharge summaries, prescriptions) with hand-labelled ground truth. Track field-level precision/recall for date, lab name→canonical, value, unit, drug, strength, frequency. **Bar:** typed lab values ≥ ~90% field accuracy; anything below confidence threshold must route to review (no silent wrong values).

### T4 — RLS gap → cross-family PHI leak · Security · **L × H = critical**
- **Owner:** Security Engineer.
- **Why it matters:** the KPI is **zero** unauthorized cross-family access. One missing policy breaks the brand.
- **Mitigation:** RLS on **every** table from migration #1; **default-deny**; a **CI test suite** asserting family-B cannot read/write family-A across every table and the storage layer; service-role key used only in the server/worker, never shipped to the client.
- **Early-warning:** any new table/endpoint without a corresponding RLS test in the same PR.
- **Contingency:** if a gap is found, treat as an incident: revoke, patch policy, audit access logs for exploitation, notify per DPDP if data was exposed.

### T5 — PHI leaves India region to the LLM provider · Compliance · **M × H = high**
- **Owner:** Security Engineer / Architect.
- **Why it matters:** documents/text sent to Claude's API cross the region boundary; DPDP residency + purpose-limitation expectations apply.
- **Mitigation:** **DPA** with no-training / zero-retention terms; send the **minimum** payload; **redact** obvious direct identifiers before the call where feasible; record the flow in the **record of processing**; surface it in the privacy policy + consent.
- **Early-warning:** new AI calls added without going through the single, reviewed extraction client.
- **Contingency:** route extraction through an in-region/self-hosted model; or process documents with on-prem OCR + region-local LLM for sensitive cohorts.

### S2 — External approvals on the critical path · Scope · **H × M = high**
- **Owner:** Engineering Manager.
- **Risks:** WhatsApp Cloud API (Meta Business verification + templates), **SMS DLT** registration (gates OTP login), **Razorpay KYC** (gates billing).
- **Mitigation:** **start all three in Week 1 (M0)**; each has an **in-app fallback** (in-app capture for WhatsApp; the OTP path must clear DLT before launch, so it's the one true dependency — see contingency; launch free if Razorpay slips).
- **Early-warning:** approval still pending at the M-boundary that needs it.
- **Contingency:** for OTP specifically — if DLT/MSG91 stalls, use Twilio (also DLT-bound for India) or, worst case, **WhatsApp/email OTP** as a temporary login while DLT clears. Never let billing or WhatsApp capture block launch.

---

## High / medium

### T2 — Long-running AI vs serverless timeouts · Technical · M × M
- **Owner:** Architect. **Mitigation:** async-by-default (ADR-008); extraction never runs inside a request; Python worker on a container (ADR-018). **Contingency:** chunk large PDFs; cap pages per job.

### T3 — Python service ops (single container) · Technical · M × M
- **Owner:** DevOps. **Mitigation:** stateless worker; health checks; restart policy; all state in Postgres; idempotent job handling. **Contingency:** redeploy/scale horizontally; jobs survive in `pgmq`.

### C1 — Public doctor-share renders PHI without login · Security · M × H
- **Owner:** Security Engineer. **Mitigation:** 128-bit unguessable tokens; **server-enforced** expiry + revocation; scope to chosen member/types/date-range; `noindex`/no-cache headers; log every access; show a "shared via SehatVault, expires <when>" banner. **Contingency:** global kill-switch to revoke all active shares.

### C2 — DPDP consent/erasure not truly first-class · Compliance · M × H
- **Owner:** Security Engineer / PM. **Mitigation:** consent dashboard + audit + export + delete are **Must-haves** (`M-18..M-20`), built in M4, tested in the acceptance gates. **Contingency:** none acceptable — these are launch-blocking.

### M1 — Gold-plating AI before the vault is usable · Delivery · M × M
- **Owner:** Engineering Manager. **Mitigation:** M1 ships a manual vault with zero AI; AI is additive in M2. **Contingency:** demo/launch on the manual vault if AI lags.

### B1 — AI cost per record erodes margin · Business · M × M
- **Owner:** Product Engineer. **Mitigation:** cheap model for extraction; cache; batch; per-record cost ceiling; gate heavy AI (Q&A) behind Plus. **Early-warning:** cost-per-active-family above target. **Contingency:** stricter gating; downscale model; throttle free tier.

### M3 — Solo-dev breadth / burnout · Delivery · M × M
- **Owner:** Engineering Manager. **Mitigation:** weekly demoable milestones; pre-agreed cut levers; protect the spine. **Contingency:** pull levers in order (`Scope.md §4`).

---

## Lower / watch

| ID | Risk | Cat | L×I | Mitigation (short) |
|---|---|---|---|---|
| T6 | Handwriting OCR poor | Tech | M×M | Expectation-setting; typed-first; correction UI. Don't market handwriting. |
| C3 | DLT registration delay blocks OTP | Compliance | M×M | Start Week 1; Twilio/WhatsApp/email OTP fallback. |
| B2 | Incumbents (Eka Care, super-apps) | Business | M×M | Win on family-first + vernacular + Tier-2/3 + WhatsApp + neutrality. |
| B3 | Cold-start capture friction | Business | M×M | One-tap photo; lab-QR seeding; WhatsApp forward (later). |
| L1 | Medical liability / wrong extraction | Legal | L×H | Non-diagnostic framing; "verify with your doctor"; show source doc; never auto-alter facts. |
| R1 | DPDP rules / ABDM policy shift | Regulatory | M×M | Build to strict end of DPDP now; modular consent/audit; watch NHA/MeitY updates. |
| S3 | ABDM scope creep | Scope | M×M | Hard-deferred (ADR-013); FHIR-aware only. |
| O1 | Supabase lock-in | Ops | L×M | Standard Postgres + S3-compatible storage = portable; revisit at scale. |

---

## Review cadence
- **Weekly (during build):** re-score T1, T4, S2 and the active-milestone risks; update early-warning readings.
- **At each milestone gate:** confirm no critical risk is unmitigated before advancing.
- **New risk intake:** anything discovered mid-build gets an ID here before it's acted on, so nothing is fixed silently.
