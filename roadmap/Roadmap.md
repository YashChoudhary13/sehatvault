# Roadmap

> Phased view from MVP to scale. Phase 1 = the `../docs/Milestones.md` M0–M4 build (≈16 weeks, detailed in `Sprints.md`). Phases 2–3 are directional, re-planned after beta learnings. Dates are relative to **build start = Week 1**.

---

## Phase 1 — MVP (Weeks 1–16) → closed beta
The spine (Phase 0 §0.7) + the SHOULD layer if time allows.
- **M0 (Wk 1–2)** Foundations, auth, RLS, design system.
- **M1 (Wk 3–6)** Manual vault: members, capture, encrypted storage, record view, manual entry.
- **M2 (Wk 7–10)** AI auto-organise: Python worker, extraction, normalisation, trends, review card, medicines, embeddings.
- **M3 (Wk 11–13)** Use & reach: doctor share, reminders, Hindi + elder mode, (Should) WhatsApp/Q&A.
- **M4 (Wk 14–16)** Trust & beta: consent dashboard, audit, export/delete, hardening, (Should) billing, **20–50 family beta**.
- **Exit:** `MVP.md` acceptance gates green.

## Phase 2 — Network & depth (Months 5–8) → public launch
Layer the moat onto a proven spine.
- **ABDM/ABHA**: ABHA create/verify (M1) + HIU consent + FHIR-bundle fetch (M3) — sandbox → production.
- **Lab/diagnostic HIP push** (reports arrive automatically).
- **Co-caregiver invites** + multi-family RBAC (`family_member_user`).
- **WhatsApp** capture + reminders to GA (post Meta approval).
- **AI Q&A** GA; **emergency card**; **refill prediction**; **2 regional languages** + Bhashini.
- **Native mobile** evaluation (if web retention signals demand it).

## Phase 3 — Scale & B2B2C (Months 9–12+)
- **Diagnostic-lab / clinic** partnerships (QR report-seeding, co-branding).
- **Insurer** claim bundles; **pharmacy** refill (opt-in commerce).
- **Eldercare bridge** → power [ApnaParent].
- **Drug-interaction / duplicate-test** advisories; **child growth charts**.
- **Significant-Data-Fiduciary readiness**: field-level/envelope encryption (`P-05`), DPIA, in-India DPO, independent audit.
- Infra hardening: self-managed Postgres on **AWS Mumbai** if scale/cost warrants.

---

## Sequencing logic (why this order)
1. **Value before network:** the manual+AI vault is useful with zero integrations, so we ship it first and let ABDM/lab-push *compound* it (the README's core bet).
2. **Trust before growth:** consent/audit/export/delete land in MVP, not later — they're the brand.
3. **Approval-gated items off the critical path:** WhatsApp, ABDM, billing are arranged so none can block the MVP launch.
4. **Encryption hardening tied to a real trigger** (SDF/B2B2C), not done speculatively.

## Re-planning checkpoints
- **After M4 beta:** read retention + extraction accuracy + which SHOULD features users actually used → re-prioritise Phase 2.
- **Before each phase:** re-score `Risks.md`; confirm the wedge (elder-caregiver vs chronic-illness) from real data.
