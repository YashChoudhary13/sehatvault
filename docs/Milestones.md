# Milestones.md — M0–M4 with Exit Criteria

> Outcome milestones, not task lists (tasks live in `tasks/Backlog.md`, week-by-week in `roadmap/Sprints.md`). Each milestone ends in a **demoable outcome** and a hard **exit gate**. You cannot start the next milestone until the current gate is green. This is how a solo dev stays honest.
>
> Cadence ≈ the README's 4-month plan: **M0** ≈ Week 0–1, **M1** ≈ Month 1, **M2** ≈ Month 2, **M3** ≈ Month 3, **M4** ≈ Month 4.

---

## M0 — Foundations & guardrails  *(Week 0–1)*
**Outcome:** An empty but *correct* skeleton: repo, CI, Supabase project, design system, auth that logs a real phone in, and an RLS-isolated `member_profile` you can read only as its owner.

**Includes:** Turborepo + pnpm; `apps/web` Next.js 15 + Tailwind + shadcn/ui; Supabase project (`ap-south-1`) with migrations tooling; CI (lint, typecheck, test, migration check); Sentry; i18n scaffolding (en, hi); Phone-OTP login (MSG91 DLT *in progress*); the first two tables (`family`, `member_profile`) **with RLS**.

**Exit gate:**
- [ ] A new phone number can sign in and create a family + one member.
- [ ] The automated **RLS test** proves family-B cannot read family-A's member. *(Zero-leak invariant established here, before any PHI exists.)*
- [ ] CI is green on a clean clone; one-command local bootstrap works.
- [ ] Long-lead admin started: DLT registration, WhatsApp Business application, Razorpay KYC, domain/trademark check.

---

## M1 — The manual vault  *(Month 1)*
**Outcome:** A family can store and view real medical documents securely — **valuable with zero AI**.

**Includes:** member CRUD + app-lock PIN; capture (camera/gallery/PDF, multi-page); encrypted private-bucket storage + signed-URL viewer; record list + detail; manual structured entry/edit; home/family switcher.

**Exit gate:**
- [ ] Upload a 3-page PDF lab report → it stores, lists, and opens via a short-lived signed URL.
- [ ] Documents are **not** reachable without auth (bucket is private; direct URL 403s).
- [ ] Manual entry produces a structured record visible on the member timeline.
- [ ] **Demo:** "add family, upload a report, see it stored securely."

---

## M2 — AI auto-organise  *(Month 2)*
**Outcome:** The "aha" — snap a report, it reads itself into structured data, trends, and medicines.

**Includes:** Python FastAPI service (Render) + `pgmq` jobs; async vision-LLM extraction → strict JSON; record-type classification; confidence + human-in-the-loop review card; lab-value normalisation (canonical/LOINC); trend charts; medicine parsing; embeddings → `pgvector` (written, not yet queried).

**Exit gate:**
- [ ] Upload a **typed** lab report → structured observations appear; HbA1c/sugar auto-charts after 2+ reports.
- [ ] Upload a prescription → medicines list populates (drug/strength/frequency).
- [ ] Low-confidence fields route to the **review card**; user edits persist as source of truth.
- [ ] Extraction meets the bar on the **eval set** (see `Risks.md` T1).
- [ ] **Demo:** "snap a lab report → timeline + auto-charted trend; snap a prescription → medicine list."

---

## M3 — Use & reach  *(Month 3)*
**Outcome:** The vault becomes *active and shareable* — the value leaves the app.

**Includes:** doctor share (scoped, time-limited, revocable link + QR) → clean public Next.js summary + access log; reminders (meds/appointments) via web-push/in-app, "Taken/Skip"; vernacular pass (Hindi complete, elder mode); **Should:** WhatsApp capture + reminders (if Meta approved), AI Q&A (RAG) with citations.

**Exit gate:**
- [ ] Create a share scoped to "last 6 months, lab reports"; a logged-out browser sees exactly that; it **expires** and **revokes** correctly; access is logged.
- [ ] A medicine reminder fires and records Taken/Skip.
- [ ] The app is fully usable in **Hindi** and in **elder mode**.
- [ ] **Demo:** "share to a doctor via QR; get a medicine reminder; (if ready) ask 'last sugar reading?'"

---

## M4 — Trust, billing & closed beta  *(Month 4)*
**Outcome:** A trustworthy, launchable product in real families' hands.

**Includes:** consent dashboard (view/revoke every share + access); immutable audit log surfaced to the user; export (documents + structured) + delete account/data; security hardening pass; onboarding/empty/error/offline states; **Should:** Razorpay Free/Plus gating; **stretch:** ABDM sandbox M1+M3 demo.

**Exit gate (= the `MVP.md` acceptance gates):**
- [ ] Onboarding → first AI-organised record in **< ~90s**.
- [ ] Cross-family isolation suite **green** (zero leakage).
- [ ] Share expiry + revocation + logging verified end-to-end.
- [ ] Export produces a complete openable archive; delete removes account + documents + rows.
- [ ] Extraction quality bar met on the eval set.
- [ ] Usable in Hindi + elder mode.
- [ ] **20–50 real families** onboarded; analytics instrumented.

---

## Milestone dependency & slip rule
```
M0 ─► M1 ─► M2 ─► M3 ─► M4 (beta)
                 │
   embeddings written at M2 ──► (Q&A at M3, only if spine stable)
```
- **Slip rule:** if a milestone gate isn't green by its time-box, pull a **cut lever** (`Scope.md` §4) rather than slipping the gate. The gate is fixed; the feature set flexes.
- **Never advance** past M0's RLS gate or M4's isolation/export/delete gates — these are trust-critical and non-negotiable.
