# SehatVault — Product Vision

> The canonical product **"why"**: the problem, market, users, and business thinking. Delivery/architecture
> decisions live in [`Decisions.md`](Decisions.md) and [`architecture/Engineering-Plan.md`](architecture/Engineering-Plan.md);
> the full original spec (with the legacy stack) is preserved at
> [`history/Original-Product-Spec.md`](history/Original-Product-Spec.md).

## One line
A privacy-first, vernacular, family-first health-record vault for India: capture → AI auto-organise → remind →
share, built on the ABDM/ABHA rails the government created but nobody has made usable.

## The problem
In India a person's medical history is **paper, scattered, and stateless**. Records live in plastic bags;
small clinics keep little digitally; every new doctor starts from scratch → repeated tests, drug-interaction
risk, worse care. It is a **family** problem: one person (usually a daughter/wife/mother) manages everyone's
reports, medicines, and appointments. The elderly + chronic-illness load (diabetes, BP, thyroid, cardiac,
dialysis) means monthly tests and lifelong medication, and distance (NRIs) multiplies it.

## Why now
- **ABDM/ABHA** is live with a public sandbox — records can (with consent) be fetched as FHIR bundles.
- **Vision LLMs** make OCR of messy Indian medical documents finally viable (typed reports extract well).
- **Vernacular AI** matured (Bhashini + AI4Bharat + LLM translation).
- **DPDP Act 2023** sets clear consent/encryption rules → privacy-by-design is a differentiator.
- Distribution rails (UPI, messaging, DigiLocker, Aadhaar/ABHA) are available to a tiny team.

## Target users
- **"Priya," 34** — the family health manager (Tier-1/2): manages a parent's BP meds, a child's vaccines, her own thyroid. Wants one place + reminders + to stop re-explaining history.
- **"Arjun," 38** — NRI remote coordinator for parents in a Tier-2 town. Wants instant access to latest reports + meds, and to brief a doctor in an emergency. Pays in foreign currency.
- **Secondary:** chronic-illness patients (trend tracking), parents of young kids, seniors themselves (dead-simple, large-font, vernacular).

## Competitive gap SehatVault owns
*Family-first* + *true vernacular* + *active health management* (reminders, trends, Q&A) + *neutral* (not selling
you consults/medicine) + *Tier-2/3 reach*. DigiLocker is a generic file store; Eka Care/Driefcase are
individual-centric/English-leaning; Practo/Apollo/1mg lock records to their ecosystem; Apple Health isn't
India-localised. Nobody combines the above.

## Product principles
1. **Family-first** — one account → many member profiles.
2. **Capture is one tap** — snap a photo; AI files and understands it.
3. **Vernacular from day one** — English + Hindi at MVP; elder mode.
4. **Active, not passive** — remind, trend, warn, answer.
5. **Trust is the product** — privacy-by-design, encryption, no data-selling, transparent consent.
6. **Works without ABDM** — fully useful on manual uploads; ABDM is upside.

## Business model
Freemium, family-plan-led, never sell data. Free (≈3 members, manual capture, timeline, basic reminders);
**Plus** (₹99–199/mo or ~₹999/yr per family: unlimited members, AI Q&A, trends, priority OCR, notifications,
emergency card); **NRI plan** (USD/GBP-priced for the diaspora — highest willingness to pay). Later **B2B2C**:
diagnostic labs/clinics, insurers (claim bundles), eldercare, pharmacies (opt-in refill).

## Go-to-market (wedge)
Caregivers of elderly parents + chronic-illness families (highest pain → highest retention). Seed via diagnostic
labs ("save your report forever, free"), notification/share virality, NRI communities, and vernacular content.
Land-and-expand within the family (manager → parents → spouse → kids).

## Why this is a standout portfolio project
Healthcare interoperability (FHIR R4, ABDM/ABHA — Phase 2), an applied AI pipeline (vision OCR → structured
extraction → LOINC normalisation → pgvector RAG with guardrails), full-stack + a Python AI microservice,
security/compliance maturity (DPDP, RLS, consent dashboards, audit logging), and real product/business judgment.
