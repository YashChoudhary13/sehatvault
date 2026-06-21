# MVP.md — The Scope Contract

> This is the **commitment** for the first public release. If a feature is not in **Must-have**, it cannot block launch. Derived from `Phase0-Architecture-Review.md` and the README. When in doubt, defend the **spine** (Phase 0 §0.7).
>
> **MVP definition:** A web-first (Next.js 15 PWA), DPDP-compliant family health-record vault where an Indian caregiver can add a member's medical documents, have them auto-organised by AI into a readable timeline with lab-value trends, set medicine/appointment reminders, and share a scoped, expiring, audit-logged summary with a doctor.

---

## Legend
- **MUST** — ships in v1.0, or we do not launch. The spine.
- **SHOULD** — strongly wanted in v1.0; first to be cut if behind; ships within ~4 weeks post-launch if cut.
- **NICE** — opportunistic; only if ahead of schedule.
- **POST-MVP** — explicitly out of v1.0; planned for later phases.

---

## MUST-HAVE (v1.0 spine)

### Identity & family
- **M-01** Phone-OTP signup/login (MSG91 via Supabase Auth). Session + app-lock PIN.
- **M-02** Create a family (single owner) on first run.
- **M-03** Add/edit **member profiles** (name, relationship, DOB, sex, blood group, allergies[], chronic conditions[], emergency contact). Self + others.
- **M-04** **Row-Level Security** isolating every family's data. Default-deny. Automated cross-family leak tests.

### Capture & storage
- **M-05** One-tap **capture**: camera, gallery image, PDF upload. Multi-page supported.
- **M-06** **Encrypted document storage** (private bucket, signed URLs, India region).
- **M-07** **Record list + record detail** — view original document immediately, regardless of AI status.
- **M-08** **Manual structured entry / edit** — works even if AI is unavailable (the vault is useful without AI).

### AI auto-organise
- **M-09** Async **vision-LLM extraction** → strict JSON: record type, date, facility, doctor, observations[], medications[].
- **M-10** **Record-type classification** (prescription / lab_report / scan / discharge / vaccination / bill / other).
- **M-11** **Confidence + human-in-the-loop**: low-confidence fields surface an editable review card; user edits are saved as the source of truth.
- **M-12** **Lab-value normalisation** to canonical names (+ LOINC where known) so trends can group values.

### Use
- **M-13** **Per-member timeline** — chronological, filter by type/date.
- **M-14** **Lab-value trends** — auto-charted recurring values (HbA1c, fasting sugar, BP, TSH, creatinine, Hb) with normal-range banding.
- **M-15** **Medicine list** parsed from prescriptions (drug, strength, frequency, duration, active flag).
- **M-16** **Reminders** for medicines + appointments; channel = best-effort web-push + in-app; "Taken/Skip" logging.
- **M-17** **Doctor share**: generate scoped (member + type/date filters), **time-limited**, **revocable** read-only link + **QR**; clean public web summary; **every access logged**.

### Trust (DPDP — non-negotiable)
- **M-18** **Consent dashboard**: list every active share + access; revoke any in one tap.
- **M-19** **Immutable audit log** of access (who/what/when) for each member.
- **M-20** **Export my data** (documents + structured data, machine-readable) and **delete account/data** — first-class, not buried.
- **M-21** **i18n scaffolding** + **English + Hindi** UI strings; **elder mode** (large font / high contrast) toggle.

---

## SHOULD-HAVE (wanted in v1.0; first cut-line)
- **S-01** **WhatsApp capture** — forward a report to the SehatVault number → filed + summarised reply. *(Gated by Meta approval; never blocks launch.)*
- **S-02** **WhatsApp reminders** with Taken/Skip quick replies. *(Same Meta gate.)*
- **S-03** **AI Q&A (RAG)** over a family's own records, with **citations** + "not medical advice" disclaimer. *(Embeddings written from Day 1 so this is a thin add.)*
- **S-04** **Refill prediction** ("BP strip runs out in ~4 days").
- **S-05** **Billing + Free/Plus gating** (Razorpay UPI + cards). *(Can launch free, add paywall in week 2–4.)*
- **S-06** **Emergency card** — minimal QR (blood group, allergies, conditions, current meds, emergency contact).

---

## NICE-TO-HAVE (only if ahead)
- **N-01** Two regional languages (e.g., Marathi/Tamil) + dynamic AI-output translation via Bhashini.
- **N-02** Drug-interaction / duplicate-test soft warnings (advisory, non-diagnostic).
- **N-03** Child growth charts (WHO/IAP percentiles) + immunisation due-date scheduler.
- **N-04** Co-caregiver invite (second user on one family, viewer role).
- **N-05** Insurance claim bundle (one-tap document set).

---

## POST-MVP (explicitly out of v1.0)
- **P-01** **ABDM/ABHA** — ABHA create/verify (M1) + HIU consent + FHIR-bundle fetch (M3). *Sandbox demo is a Phase-2 stretch; production is Phase 2+.*
- **P-02** Lab/diagnostic-chain **HIP push** integrations.
- **P-03** **Native mobile** app (RN/Expo or Flutter).
- **P-04** Full **offline sync** (queued uploads, conflict resolution).
- **P-05** App-layer **field-level / envelope encryption** (revisit at SDF threshold — `Decisions.md` ADR-012).
- **P-06** Multi-family membership + fine-grained `member_scope` RBAC.
- **P-07** Voice-first vernacular WhatsApp assistant.
- **P-08** Doctor-side companion app / verified-clinician view.
- **P-09** B2B2C partner integrations (labs, insurers, pharmacies, eldercare).
- **P-10** Anonymised consented research/population-health (opt-in only).

---

## Acceptance gates for "v1.0 done"
1. A new user completes **onboarding → first record added → AI-organised → visible on timeline** in under ~90 seconds (the README "aha").
2. Cross-family isolation test suite is **green** (zero leakage).
3. A doctor-share link renders a correct scoped summary, **expires** on time, and **revokes** instantly; access is logged.
4. **Export** produces a complete, openable archive; **delete** removes account + documents + rows.
5. Extraction quality meets the bar on the **eval set** (see `Risks.md` T1): typed lab reports ≥ target accuracy; low-confidence correctly routed to review.
6. App is usable in **Hindi** and in **elder mode**.

If all six hold, we launch the closed beta. Everything in SHOULD/NICE/POST is layered on afterward.
