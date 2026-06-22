# SehatVault — The Family Health Record Vault for India

> **One line:** A privacy-first, vernacular, WhatsApp-friendly app where an Indian family keeps *every* member's medical records — prescriptions, lab reports, scans, discharge summaries, vaccinations — automatically organised into a readable health timeline, with reminders, AI Q&A, and one-tap sharing to any doctor. Built on the ABDM/ABHA rails the government created but nobody has made usable.

> **Status:** Concept / build spec. This document is the complete product + engineering plan for a solo dev or 2–3 person team to ship an MVP in ~4 months.

---

## Table of contents
1. [TL;DR](#1-tldr)
2. [The problem](#2-the-problem)
3. [Evidence & market](#3-evidence--market)
4. [Why now](#4-why-now)
5. [Target users & personas](#5-target-users--personas)
6. [Competitive landscape](#6-competitive-landscape)
7. [Product vision & principles](#7-product-vision--principles)
8. [How it works (the core loop)](#8-how-it-works-the-core-loop)
9. [Feature set (MVP → advanced)](#9-feature-set-mvp--advanced)
10. [Key user flows](#10-key-user-flows)
11. [Information architecture / screens](#11-information-architecture--screens)
12. [Technical architecture](#12-technical-architecture)
13. [Data model](#13-data-model)
14. [AI/ML pipeline](#14-aiml-pipeline)
15. [ABDM / ABHA integration](#15-abdm--abha-integration)
16. [Vernacular & WhatsApp](#16-vernacular--whatsapp)
17. [Security, privacy & DPDP compliance](#17-security-privacy--dpdp-compliance)
18. [Business model & pricing](#18-business-model--pricing)
19. [Go-to-market](#19-go-to-market)
20. [4-month MVP build plan](#20-4-month-mvp-build-plan)
21. [Success metrics (KPIs)](#21-success-metrics-kpis)
22. [Risks & mitigations](#22-risks--mitigations)
23. [Why this is a standout resume/portfolio project](#23-why-this-is-a-standout-resumeportfolio-project)
24. [Open decisions](#24-open-decisions)
25. [References](#25-references)

---

## 1. TL;DR

| | |
|---|---|
| **What** | Family health-record vault: capture → auto-organise → remind → share. |
| **Who** | Indian families, especially those managing chronic illness, elderly parents, or kids. |
| **Wedge** | Caregivers of elderly parents + chronic-illness households (highest pain, highest retention). |
| **Why it wins** | **Family-first** (not individual), **vernacular**, **WhatsApp-native**, **active** health management (reminders, trends, Q&A) — not passive storage. |
| **Tech headline** | Vision-LLM OCR → structured extraction → **HL7 FHIR R4** → timeline + **pgvector RAG** Q&A; **ABDM/ABHA** interoperability; DPDP-compliant consent & encryption. |
| **Moat over time** | Network of linked ABHA records + lab/clinic push integrations + family lock-in + trust brand. |
| **Money** | Freemium; premium **family** plan (esp. priced for **NRIs** managing parents); B2B2C lab/clinic/insurer/eldercare partnerships. |
| **MVP** | ~4 months, solo-buildable. ABDM is Month-4 upside, not a Month-1 dependency. |

---

## 2. The problem

In India, a person's medical history is **paper, scattered, and stateless**:

- **Records live in plastic bags and drawers.** Prescriptions, X-rays, blood reports, discharge summaries — physical paper, often faded, frequently lost. When you move cities or change doctors, the history resets to zero.
- **Smaller clinics keep almost no records.** The large majority of Indians are treated at small clinics/nursing homes that maintain little or nothing digitally. Lower-income patients routinely arrive **without old prescriptions**, so doctors re-diagnose blind.
- **Every new doctor starts from scratch.** Patients re-narrate their history from memory — drug names half-remembered, dosages guessed, past test results unavailable. This causes repeated tests (wasted money), drug interactions (danger), and worse care.
- **It's a *family* problem, not an individual one.** One person (usually a daughter, wife, or mother) is the de-facto "health manager" for parents, spouse, and kids — juggling everyone's reports, medicines, and appointments in their head and across a dozen WhatsApp chats.
- **The elderly + chronic-illness load is brutal.** Diabetes, BP, thyroid, cardiac, dialysis — these mean monthly tests and lifelong medication. Tracking trends (is sugar improving?) across paper reports is nearly impossible for a layperson.
- **Distance multiplies it.** Children in metros or abroad can't physically hold their parents' files, so they can't help in an emergency when a doctor asks "what medicines is he on?"

**Net:** money wasted on repeat tests, dangerous gaps in care, and a constant, invisible cognitive load on the family's health manager.

---

## 3. Evidence & market

- **Record-keeping in India is a "gloomy picture"** — most hospitals still use manual paper/registers; smaller clinics maintain little; patients commonly don't carry prior prescriptions. (Indian medical-informatics literature.)
- **Government rails exist but go unused.** The **Ayushman Bharat Digital Mission (ABDM)** and **ABHA (health ID)** were built specifically to make records portable — but **consumer adoption is near-zero**. The hard infrastructure is done; the *usable product on top of it is missing*. This is the classic **"rails exist, product doesn't"** gap.
- **Scale.** ~**200M+ households**; **~140M senior citizens** (rising fast); a **~32M NRI** diaspora that pays in foreign currency to care for parents back home; a fast-growing chronic-disease burden (India is the "diabetes capital").
- **Willingness to pay is proven adjacent.** Families already spend on diagnostics, e-pharmacy, and ₹25k/month attendants — health is where Indian families *do* spend.
- **Distribution rails are unusually strong.** **UPI** (payments), **WhatsApp** (interface), **DigiLocker** (documents), **Aadhaar** (ABHA creation), and **Bhashini** (govt translation stack) are all available to a small team.

> **Pairs with [ApnaParent], the eldercare-coordination idea** — SehatVault is the health-records spine that an eldercare product needs. You can ship SehatVault first and grow into eldercare.

---

## 4. Why now

1. **ABDM/ABHA is live with a public sandbox.** A small team can now legitimately fetch a user's records (with consent) as standardised FHIR bundles — something impossible a few years ago.
2. **Vision LLMs make OCR of messy Indian medical documents finally viable** — typed lab reports and discharge summaries extract well; handwriting is improving.
3. **Vernacular AI matured.** Bhashini + AI4Bharat + LLM translation make Hindi + regional UX cheap to build.
4. **WhatsApp Business Cloud API** lets a tiny team meet users where they already are.
5. **DPDP Act 2023 (Rules notified Nov 2025, compliance by 13 May 2027)** sets clear consent/encryption rules — early privacy-by-design is now a *differentiator*, not overhead.
6. **Smartphone + cheap data penetration** reached Tier-2/3 (150M+ new smartphone users 2020–2024).

---

## 5. Target users & personas

**Primary wedge (build for these first):**

- **"Priya," 34, the family health manager (Tier-1/2).** Works, runs the house, manages BP meds for her father-in-law, her son's vaccinations, and her own thyroid. Drowning in paper and WhatsApp. *Wants: one place, reminders, and to stop re-explaining history to every doctor.*
- **"Arjun," 38, NRI in the US/UK.** Parents (68, 72) live in a Tier-2 town; he's the remote coordinator. *Wants: to see his mother's latest reports and medicine list instantly, and to brief a doctor in an emergency from 12,000 km away. Pays in dollars without blinking.*

**Secondary:**
- **Chronic-illness patients** (diabetes/cardiac/thyroid/dialysis) who need trend tracking.
- **Parents of young kids** (vaccination schedules, frequent illnesses, growth tracking).
- **Senior citizens themselves** — need a *dead-simple, large-font, vernacular* view (often operated by a child).

**Doctors** are a *participant*, not the customer (MVP): they receive a clean shared summary; later they become a distribution channel (QR on their desk).

---

## 6. Competitive landscape

| Player | What it is | Why it falls short |
|---|---|---|
| **DigiLocker** (govt) | Document locker; can hold ABHA-linked docs | Generic file store — no health *organisation*, no timeline, no trends, no family view, no reminders, poor UX |
| **Eka Care / Driefcase** (PHR apps) | ABHA-linked personal health records | Individual-centric, English-leaning, urban; thin on family-first + vernacular + active management; low Tier-2/3 traction |
| **Practo / Apollo 24|7 / Tata 1mg** | Super-apps with a records tab | Records are locked to *their* ecosystem (you must consult/buy through them); siloed, not a neutral family vault |
| **Hospital/lab apps** | Per-chain portals | Siloed per provider; your history fragments across 6 apps |
| **Apple Health** | iOS health hub | Not India-localised, iOS-only (tiny India share), no ABDM, no vernacular, individual-only |

**The open gap SehatVault owns:** *family-first* + *true vernacular* + *WhatsApp-native* + *active health management* (reminders, trends, AI Q&A) + *neutral* (not trying to sell you consults/medicine) + *Tier-2/3 reach*. Nobody combines these.

---

## 7. Product vision & principles

1. **Family-first.** One account → many member profiles with relationships. The default mental model is "my family's health," not "my health."
2. **Capture must be one tap.** If adding a report is harder than keeping the paper, we lose. Snap a photo (or **forward it on WhatsApp**) → it's filed and understood automatically.
3. **Vernacular from day one.** Hindi + 2 regional languages at MVP; large-font "elder mode."
4. **Active, not passive.** We don't just store — we remind, trend, warn, and answer questions.
5. **Trust is the product.** Privacy-by-design, encryption, no data-selling, transparent consent. This is the brand.
6. **Works without ABDM.** The vault is fully useful on manual uploads alone; ABDM linking is upside.
7. **Offline-tolerant.** Indian connectivity is patchy — cache, queue uploads, sync later.

---

## 8. How it works (the core loop)

```
   CAPTURE                ORGANISE                  USE
 ┌──────────┐         ┌───────────────┐       ┌────────────────────┐
 │ Snap /   │  ──►    │ AI reads it:  │  ──►  │ • Health timeline   │
 │ WhatsApp │         │ type, doctor, │       │ • Trends (sugar/BP) │
 │ forward /│         │ meds, labs,   │       │ • Medicine reminders│
 │ ABHA pull│         │ dates → FHIR  │       │ • Ask a question    │
 └──────────┘         │ + timeline    │       │ • Share to doctor   │
                      └───────────────┘       │   (QR / link)       │
                                              └────────────────────┘
        every member of the family, one account, one tap
```

---

## 9. Feature set (MVP → advanced)

### MVP (Phase 1 — the 4-month build)
- **Phone-OTP auth** (India is phone-first) + secure account.
- **Family profiles:** add members (self, parents, spouse, kids) with relationship, DOB, blood group, allergies, chronic conditions.
- **One-tap capture:** camera, gallery, PDF, and **"forward to SehatVault on WhatsApp."**
- **AI auto-organise:** OCR + extraction → record type (prescription / lab report / scan / discharge / vaccination / bill), facility, doctor, date, medicines, lab values → mapped to FHIR resources.
- **Per-member health timeline** (chronological, filterable by type).
- **Lab-value trends:** auto-chart recurring values (HbA1c, fasting sugar, BP, TSH, creatinine, Hb…).
- **Medicine list + reminders** (push + WhatsApp), parsed from prescriptions.
- **Appointment / follow-up reminders.**
- **One-tap share:** generate a time-limited, read-only **summary link + QR** for a doctor (no app needed on their side); every access logged.
- **AI Q&A (RAG):** "What was Papa's last sugar reading?" / "Is he allergic to any drug?" — answered from the family's own records, with source citations.
- **Vernacular UI:** English + Hindi + 2 regional languages; **elder mode** (large fonts, simplified).
- **Consent dashboard** (DPDP): see/revoke every share and access.

### Phase 2 (months 5–8)
- **ABHA creation + linking** in-app; **pull existing records from ABDM** (HIU + consent).
- **Lab/diagnostic-chain push integrations** (reports arrive automatically).
- **Emergency card:** a public, minimal QR (blood group, allergies, conditions, emergency contact, current meds) for first responders.
- **Insurance claim bundle:** assemble the documents a claim needs in one tap.
- **Smarter reminders:** refill predictions ("Papa's BP strip runs out in 4 days").

### Advanced / future
- **Drug-interaction & duplicate-test warnings.**
- **Doctor-side companion** (verified clinicians get a richer, structured view → distribution flywheel).
- **Growth charts** for children (WHO/IAP percentiles).
- **Voice-first vernacular assistant** on WhatsApp ("Maa ki report bhejo").
- **Eldercare bridge** → merge into / power [ApnaParent].
- **Anonymised, consented research/population-health** (only with explicit opt-in; never the default).

---

## 10. Key user flows

**A. Onboarding (≤ 90 seconds)**
Phone OTP → create family → add first member (yourself) → "Add your first report" (camera) → AI fills it in → see your timeline. *Aha moment: the app read the report for you.*

**B. Add a record via WhatsApp**
User forwards a photo/PDF of a lab report to SehatVault's WhatsApp number → bot replies "Added to **Papa**'s records ✅ — Blood test, 18 Jun, Dr. Rao. HbA1c 7.8 (slightly high)." → record appears in app. *Zero app-switching; meets users where they are.*

**C. Share with a doctor**
At the clinic: tap **Share → choose member → choose what (e.g., last 6 months / diabetes only) → set expiry (e.g., 24h)** → show QR. Doctor scans, sees a clean web summary (timeline + meds + key trends + documents). Access auto-expires and is logged.

**D. Medicine reminder**
Prescription parsed → "Metformin 500mg, twice daily, 30 days" → reminders fire on push + WhatsApp → "Taken / Skipped" tracked → refill alert before it runs out.

**E. Link existing records (Phase 2)**
Create/verify ABHA → discover linked facilities → grant consent → SehatVault pulls historical records as FHIR bundles → auto-merged into the timeline.

**F. Emergency (NRI)**
Arjun (abroad) opens his mother's profile → taps **Emergency summary** → reads current meds, allergies, last cardiac report → forwards the share link to the attending doctor on WhatsApp.

---

## 11. Information architecture / screens

- **Home / Family switcher** — cards per member with a health-status glance + "Add record" FAB.
- **Member profile** — vitals, conditions, allergies, blood group, emergency contact.
- **Timeline** — chronological records, filter by type/date/doctor.
- **Record detail** — original document + extracted structured data (editable; human-in-the-loop correction).
- **Trends** — charts for recurring lab values & vitals.
- **Medicines** — active meds, schedule, adherence, refills.
- **Reminders** — meds + appointments.
- **Ask (AI)** — chat over the family's records.
- **Share & Consent** — active shares, ABDM consents, full access log (DPDP dashboard).
- **Settings** — language, elder mode, security (PIN/biometric), export, delete account/data.

---

## 12. Technical architecture

### 12.1 High-level

```
        ┌──────────────────────────────┐        ┌───────────────────────┐
        │  Mobile app (React Native /  │        │  Web (Next.js)        │
        │  Expo) — primary, India-first│        │  • Doctor share view  │
        │  + WhatsApp as a 2nd surface │        │  • Admin / ops        │
        └──────────────┬───────────────┘        └───────────┬───────────┘
                       │  HTTPS / REST + WebSocket            │
                       ▼                                      ▼
        ┌─────────────────────────────────────────────────────────────┐
        │  API Gateway / BFF  (NestJS, TypeScript)                     │
        │  Auth · family/RBAC · records CRUD · sharing · consent       │
        │  reminders · billing · audit logging                         │
        └───────┬───────────────────────┬──────────────────┬──────────┘
                │                        │                  │
                ▼                        ▼                  ▼
   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
   │ AI service         │   │ ABDM service       │   │ Notification service │
   │ (Python, FastAPI)  │   │ (M1/M2/M3, FHIR,   │   │ WhatsApp Cloud API · │
   │ OCR · extraction · │   │ consent, HIU)      │   │ FCM push · scheduler │
   │ FHIR map · RAG     │   └─────────┬──────────┘   └──────────────────────┘
   └─────────┬──────────┘             │
             │                        │
             ▼                        ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │ Data layer                                                        │
   │  • PostgreSQL (Supabase): users, members, records, meds, consent, │
   │    audit, + pgvector (RAG embeddings)                             │
   │  • Object storage (S3-compatible, India region): encrypted docs   │
   │  • Redis: queues (uploads, reminders), cache                      │
   └──────────────────────────────────────────────────────────────────┘
```

### 12.2 Stack & rationale

| Layer | Choice | Why |
|---|---|---|
| **Mobile** | **React Native (Expo)** | India is mobile-first; one codebase iOS+Android; fast iteration. (Flutter is a fine alt.) |
| **Web** | **Next.js + TypeScript + Tailwind** | Doctor share-view (no-install web), admin, marketing, SEO. |
| **Core API** | **NestJS (TypeScript)** | Type-safe, structured, very employable; clean modules for auth/records/consent. |
| **AI microservice** | **Python + FastAPI** | Best ecosystem for OCR/LLM/FHIR libs; demonstrates microservice design. |
| **DB** | **PostgreSQL (Supabase)** + **pgvector** | One DB for relational + vector RAG; RLS for per-family isolation; generous free tier. |
| **Object storage** | **S3-compatible, India region** | Encrypted documents; data-residency friendly. |
| **Queue/cache** | **Redis** | Async OCR jobs, scheduled reminders, rate-limit. |
| **Auth** | **Phone OTP** (Supabase Auth / Firebase Auth) + biometric/PIN app-lock | Phone-first India; ABHA later. |
| **LLM** | **Claude** (vision for OCR/extraction; text for Q&A/summaries) | Strong vision + structured-output + multilingual; use a smaller model for cheap high-volume extraction, a larger one for reasoning. |
| **Embeddings** | Multilingual embedding model → pgvector | RAG over the family's own records. |
| **Translation** | **Bhashini** (+ LLM fallback) | India-specific, govt-backed vernacular stack — a standout integration. |
| **Messaging** | **WhatsApp Business Cloud API** | Capture + reminders + share, where users live. |
| **Payments** | **UPI** via Razorpay/Cashfree; international cards for NRIs | Indian + diaspora monetisation. |
| **Infra** | Docker; deploy on Railway/Render/Fly.io (MVP) → AWS Mumbai (scale) | Cheap to start; India region for residency. |
| **Observability** | Sentry + structured logs + audit trail | Compliance + reliability. |

---

## 13. Data model

Core entities (Postgres; every health table scoped by `family_id` with row-level security):

- **`user_account`** — `id`, `phone`, `email?`, `auth_provider`, `created_at`, `locale`, `is_data_fiduciary_flags`.
- **`family`** — `id`, `owner_user_id`, `name`, `created_at`. (A user may belong to multiple families; roles below.)
- **`family_membership`** — `user_id`, `family_id`, `role` (`owner` / `manager` / `viewer`), `member_scope` (which member-profiles they can see).
- **`member_profile`** — `id`, `family_id`, `display_name`, `relationship`, `dob`, `sex`, `blood_group`, `allergies[]`, `chronic_conditions[]`, `emergency_contact`, `abha_id?`, `photo?`.
- **`health_record`** — `id`, `member_id`, `family_id`, `type` (prescription/lab_report/scan/discharge/vaccination/bill/other), `source` (manual/whatsapp/abdm/lab_push), `file_object_key` (encrypted), `record_date`, `facility?`, `doctor?`, `ocr_status` (pending/done/needs_review), `created_by`.
- **`extracted_observation`** — `id`, `record_id`, `member_id`, `loinc_code?`, `name`, `value`, `unit`, `reference_range?`, `flag` (low/normal/high), `observed_at`. → maps to FHIR **Observation**.
- **`medication`** — `id`, `member_id`, `record_id?`, `drug_name`, `strength`, `frequency`, `duration`, `start_date`, `end_date?`, `active`. → FHIR **MedicationStatement/Request**.
- **`condition`** — `id`, `member_id`, `name`, `icd_code?`, `noted_at`. → FHIR **Condition**.
- **`immunization`** — `id`, `member_id`, `vaccine`, `dose`, `given_at`, `due_at?`. → FHIR **Immunization**.
- **`reminder`** — `id`, `member_id`, `kind` (medication/appointment/refill/test), `schedule` (cron/RRULE), `channels[]` (push/whatsapp), `next_fire_at`, `status`.
- **`share_grant`** — `id`, `member_id`, `created_by`, `scope` (filters/date-range/types), `token`, `expires_at`, `revoked_at?`.
- **`access_log`** — `id`, `share_grant_id?`, `actor` (user/doctor-link/abdm), `action`, `member_id`, `at`, `ip/agent`. *(DPDP audit trail.)*
- **`abdm_consent`** — `id`, `member_id`, `abha_id`, `consent_artefact_id`, `scope`, `granted_at`, `expires_at`, `status`.
- **`record_embedding`** — `id`, `record_id`, `member_id`, `chunk`, `embedding vector`, for pgvector RAG.
- **`subscription`** — `id`, `family_id`, `plan`, `status`, `provider_ref`, `renews_at`.

**FHIR mapping note:** keep your internal model relational and *map to FHIR R4 at the boundaries* (ABDM exchange, exports). Don't force your whole DB to be FHIR — that's a common over-engineering trap.

---

## 14. AI/ML pipeline

The capture-to-structure pipeline (runs in the Python AI service, async via Redis queue):

```
upload ─► pre-process (deskew, enhance, PDF→images)
       ─► OCR + extraction (Vision LLM → strict JSON schema)
       ─► classify record type
       ─► normalise (map lab names→LOINC, drugs→standard names, units)
       ─► confidence check ── low? ─► flag "needs review" (human-in-loop UI)
       ─► persist structured rows + map to FHIR resources
       ─► chunk + embed → pgvector (for Q&A)
       ─► generate a 1-line plain-language summary (+ vernacular)
```

**Components:**
1. **Extraction (the hard, valuable part).** Vision-LLM-first: send the image/PDF to a vision model with a strict JSON schema (type, date, facility, doctor, `observations[]`, `medications[]`, `diagnoses[]`). Falls back to Document AI/Tesseract for cost on clean typed docs. **Handwritten prescriptions are the known hard case** → start with typed lab reports & discharge summaries (extract cleanly), treat handwriting as best-effort + human correction.
2. **Normalisation.** Map messy lab names ("Blood Sugar (F)", "FBS") → canonical + **LOINC**; map drug brand names → generic; standardise units. A lookup table + LLM assist.
3. **Human-in-the-loop.** Anything below a confidence threshold shows an editable review card. User corrections become training/eval data.
4. **Trends.** Group `extracted_observation` by canonical code → time series → charts + "improving/worsening" flags.
5. **RAG Q&A.** Retrieve the member's relevant record chunks from pgvector → answer with **citations to source records** → *never* invent values; if unknown, say so. Add a clear "not medical advice" disclaimer.
6. **Vernacular layer.** Summaries/answers generated or translated into the user's language (Bhashini + LLM).

**Guardrails:** strict "answer only from the user's records," confidence surfacing, non-diagnostic framing, and an audit of every AI output that touches health data.

---

## 15. ABDM / ABHA integration

ABDM (Ayushman Bharat Digital Mission) is what makes this **interoperable and credible** — and it's the rare line on a resume that Indian health-tech recruiters love. SehatVault is primarily an **HIU (Health Information User)**: with the user's consent, it pulls their records from across the network.

**The building blocks:**
- **ABHA** — the citizen's unique health ID (created via Aadhaar/mobile).
- **HIP** (Health Information Provider) — hospitals/labs/pharmacies that hold records.
- **HIU** (Health Information User) — apps/insurers that consume records → **this is us**.
- **HIE-CM** (Health Information Exchange & **Consent Manager**) — mediates every exchange.
- **Standard:** **HL7 FHIR R4** + the ABDM Implementation Guide; records move as **FHIR bundles**.

**Sandbox milestones (NHA):**
- **M1 — ABHA:** create/verify ABHA in-app (Aadhaar/mobile OTP). *(~2–4 weeks.)*
- **M2 — Linking:** discover a user's records at facilities and link them (each visit = a "care context").
- **M3 — Data exchange:** **consent management** + actually fetch records as FHIR bundles. *(The complex one; full HIU + consent typically 6–12 weeks incl. sandbox testing.)*

**Phasing for SehatVault:**
- **MVP (Months 1–4):** *skip live ABDM*; build the manual + WhatsApp vault that's valuable on its own. **Architect the data model FHIR-aware** so ABDM slots in cleanly.
- **Month 4 (sandbox):** implement **M1 (ABHA create/verify)** + the **M3 HIU** consent+fetch flow in the **sandbox** to demonstrate end-to-end interoperability (huge for the portfolio/demo).
- **Phase 2 (production):** complete NHA sandbox sign-off → go live → records auto-import; add **lab/clinic HIP push** so reports arrive without scanning.

> **Why not depend on ABDM for MVP value?** Because most records aren't on the network *yet*. The manual AI vault delivers value today; ABDM compounds it as adoption grows. That sequencing is the whole product bet.

---

## 16. Vernacular & WhatsApp

**Vernacular (a real moat in Tier-2/3):**
- MVP languages: **English, Hindi, + 2 regional** (pick by launch geography, e.g., Marathi/Tamil/Telugu/Bengali).
- UI strings via i18n; **dynamic content** (AI summaries, answers) translated via **Bhashini** (govt stack — India-specific, a great résumé line) with LLM fallback.
- **Elder mode:** large fonts, high contrast, minimal screens, voice prompts.

**WhatsApp (the interface India actually uses):**
- **Capture:** forward any report photo/PDF to SehatVault's WhatsApp number → auto-filed + summarised reply.
- **Reminders:** medicine/appointment/refill nudges with "Taken/Skip" quick replies.
- **Share:** send a doctor the time-limited summary link in one tap.
- **(Later) voice bot:** "Maa ki latest report dikhao." Built on WhatsApp Business Cloud API.

---

## 17. Security, privacy & DPDP compliance

Trust *is* the product. Build privacy-by-design from commit #1.

**India's DPDP Act 2023** (Rules notified **13 Nov 2025**; compliance deadline **13 May 2027**) — what it means here:
- **Consent must be free, specific, informed, unambiguous, and a clear affirmative action.** Health data → explicit consent for every processing purpose.
- **Withdrawal as easy as granting** → the in-app **Consent dashboard** (revoke any share/ABDM consent in one tap).
- **Purpose limitation & data minimisation** — collect only what's needed; never sell data.
- **Breach notification** to the Data Protection Board (all breaches) → have an incident process + audit logs ready.
- **Children/dependents:** verifiable consent for minors; note the **emergency-treatment exemption**. (Relevant since families manage kids' and elders' data.)
- At scale you may be a **Significant Data Fiduciary** → DPO in India, independent audit, **DPIA**. Design for it early even if not required yet.

**Engineering controls:**
- **Encryption in transit** (TLS 1.2+) and **at rest** (AES-256); **field-level/app-layer encryption** for the most sensitive fields; envelope encryption for documents with per-object keys.
- **Object storage in an India region** (data residency).
- **RBAC per family** + Postgres **row-level security** so no family can ever read another's rows.
- **Time-limited, scoped, revocable share tokens**; signed URLs for documents.
- **Immutable audit log** of every access (user, doctor-link, ABDM).
- **App lock** (PIN/biometric); short-lived sessions; device management.
- **Secrets management**, least-privilege service accounts, dependency scanning.
- **Right to export & delete** (account + data) — first-class, not buried.

---

## 18. Business model & pricing

**Freemium, family-plan-led. Never sell data.**

- **Free:** up to ~3 members, limited storage, manual capture, timeline, basic reminders. (Gets families hooked.)
- **SehatVault Plus (₹99–199/mo or ~₹999/yr per family):** unlimited members, full AI Q&A, trend analytics, ABHA auto-sync, priority OCR, WhatsApp reminders, emergency card.
- **NRI plan (priced in USD/GBP, e.g., $4–6/mo):** same as Plus, framed for diaspora managing parents — *highest willingness to pay, lowest price sensitivity.*
- **B2B2C partnerships (the scalable layer):**
  - **Diagnostic labs / clinics** — co-branded "get your report in SehatVault" (they pay for retention/branding; you get auto-fed records).
  - **Insurers** — one-tap claim-document bundles; faster claims.
  - **Eldercare services / hospitals** — bundle SehatVault as the records spine (→ [ApnaParent] synergy).
  - **Pharmacies** — refill reminders → consented commerce (opt-in only).

**Unit-economics note:** OCR/LLM cost per record is the main variable cost → use a cheap model for high-volume extraction, cache aggressively, batch, and gate heavy AI behind Plus.

---

## 19. Go-to-market

1. **Pick a sharp wedge:** caregivers of elderly parents + chronic-illness families (diabetes/BP/thyroid). Highest pain → highest retention.
2. **Seed via diagnostic labs in 1–2 cities:** a QR on the report ("Save this report forever, free") — instant, relevant capture moment.
3. **WhatsApp virality:** every doctor-share and every "forward your report" is a referral surface; add "Sent securely via SehatVault."
4. **NRI channels:** subreddits/communities, NRI Facebook groups — "manage your parents' health from abroad."
5. **Vernacular content** (YouTube/Instagram in Hindi + regional): "stop losing your medical reports."
6. **Doctor desk QR (Phase 2):** clinics hand patients a way to keep records → low-cost acquisition + a doctor-side flywheel.
7. **Land-and-expand within the family:** the manager onboards, then adds parents, spouse, kids → multi-member accounts retain hard.

---

## 20. 4-month MVP build plan

Assumes 1 strong full-stack dev (or 2–3 people). Each month ends with something demoable.

### Month 1 — Foundation & vault
- Repo, CI, Docker, environments; design system + i18n scaffolding.
- **Phone-OTP auth**, app-lock (PIN/biometric).
- **Family + member-profile** model, RBAC, Postgres RLS.
- **Capture + encrypted storage** (camera/gallery/PDF); record list & detail (raw doc view).
- Manual structured entry as fallback.
- *Demo: add family, upload a report, see it stored securely.*

### Month 2 — AI auto-organise
- Python AI service + Redis queue.
- **Vision-LLM extraction → strict JSON → structured rows**; record-type classification.
- **Lab-value normalisation** (canonical/LOINC) + **trend charts**.
- **Human-in-the-loop** review/correct UI.
- Medicine parsing from prescriptions.
- *Demo: snap a lab report → timeline + auto-charted HbA1c; snap a prescription → medicine list.*

### Month 3 — Use & reach (share, remind, vernacular, Q&A)
- **Doctor share:** scoped, time-limited **link + QR** → clean web summary (Next.js) + access log.
- **Reminders** (meds/appointments) via **FCM + WhatsApp Cloud API**; "Taken/Skip."
- **WhatsApp capture** (forward a report → filed + summarised).
- **Vernacular:** Hindi + 2 regional (Bhashini + LLM) + **elder mode**.
- **AI Q&A (RAG)** over the family's records with citations + disclaimers.
- *Demo: share to a doctor via QR; get a WhatsApp medicine reminder; ask "last sugar reading?" in Hindi.*

### Month 4 — Trust, ABDM (sandbox) & beta
- **DPDP consent dashboard**, full audit log, export/delete, encryption hardening.
- **ABDM sandbox:** **M1 ABHA create/verify** + **M3 HIU** consent + **FHIR-bundle fetch** (proves interoperability end-to-end).
- **Billing** (UPI via Razorpay/Cashfree) + Free/Plus gating.
- Polish, onboarding, empty states, error/offline handling.
- **Closed beta with 20–50 real families** (recruit from the wedge); instrument analytics.
- *Demo: full loop + "link your ABHA and import records" in sandbox.*

> **Cut-scope levers if behind:** ship ABDM as Phase 2 (MVP value doesn't need it); launch with English+Hindi only; defer trends or Q&A. Protect: capture, auto-organise, share, reminders, security.

---

## 21. Success metrics (KPIs)

**Activation:** % of new users who add ≥1 record in 24h; time-to-first-record.
**Core value:** records/family; % families with **2+ members** (the family-first signal); auto-extraction accuracy & % needing correction.
**Engagement:** D30/D90 retention; reminders acted on; doctor-shares created; AI questions asked.
**Network:** ABHA links; records auto-imported; lab-push records (Phase 2).
**Business:** Free→Plus conversion; NRI-plan share; CAC by channel; gross margin per family (watch AI cost).
**Trust:** consent-dashboard usage; zero unauthorized cross-family access (must be 0); breach MTTR.

---

## 22. Risks & mitigations

| Risk | Mitigation |
|---|---|
| **Handwritten prescriptions OCR poorly** | Start with typed lab reports/discharge summaries; vision-LLM + human-in-loop; set expectations; improve over time. |
| **ABDM adoption is low** | MVP value is standalone (manual vault); ABDM is upside, not a dependency. |
| **Data sensitivity / trust deficit** | Privacy-by-design, encryption, no data sale, transparent consent, DPDP compliance, India residency — and *market* it. |
| **Cold-start capture friction** | One-tap photo + WhatsApp-forward + lab QR seeding; auto-extract removes typing. |
| **AI cost per record** | Cheap model for extraction, caching/batching, gate heavy AI behind Plus. |
| **Incumbents (Eka Care, super-apps)** | Win on family-first + vernacular + Tier-2/3 + WhatsApp + neutrality; eldercare bridge. |
| **Regulatory shifts (DPDP rules, ABDM policy)** | Build to the strict end of DPDP now; modular consent/audit; watch NHA updates. |
| **Medical-liability / wrong extraction** | Non-diagnostic framing, "verify with your doctor," show source doc, never auto-alter medical facts. |
| **Solo-dev scope blowout** | Strict MVP cut-lines (above); ABDM and Q&A are the first things to defer. |

---

## 23. Why this is a standout resume/portfolio project

It hits the rare combination Indian health-tech, fintech, and product companies actively hunt for:

- **Healthcare interoperability** — real **HL7 FHIR R4** + **ABDM/ABHA** (HIP/HIU/Consent Manager). *Very few candidates have touched this.*
- **Applied AI/ML pipeline** — vision OCR, **structured extraction**, normalisation (LOINC), **RAG/vector search (pgvector)**, multilingual generation — with **guardrails**, not a toy wrapper.
- **Full-stack + microservices** — RN/Expo + Next.js + NestJS + a Python AI service + Postgres/Redis/object storage.
- **Security & compliance maturity** — **DPDP 2023**, encryption, RBAC + RLS, consent dashboards, audit logging. Signals you can be trusted with real user data.
- **Localization at scale** — **Bhashini**/vernacular, elder mode.
- **Platform integrations** — **WhatsApp Business Cloud API**, **UPI** payments, **DigiLocker/Aadhaar/ABHA**.
- **Product & business judgment** — family-first insight, wedge GTM, freemium + NRI pricing, the "rails exist, product doesn't" thesis.

**Interview soundbite:** *"I built the usable consumer product on top of India's national health-data rails (ABDM/ABHA) — a family vault that uses vision-LLMs to turn paper reports into a FHIR-structured timeline, answers questions over a family's own records with RAG, and ships DPDP-compliant consent and encryption."*

---

## 24. Open decisions

- **Mobile framework:** React Native/Expo (recommended) vs Flutter.
- **MVP languages/geography:** which 2 regional languages → driven by where you'll recruit the first 50 families.
- **OCR mix:** vision-LLM-only vs vision-LLM + Document AI fallback (cost vs accuracy).
- **Wedge:** elderly-parent caregivers vs chronic-illness families first (can do both, but pick the hero for messaging).
- **B2B timing:** how early to approach diagnostic labs for report-seeding.
- **Brand/name:** "SehatVault" (sehat = health, widely understood across Hindi/Urdu) — check trademark/domain; alternatives: Arogya Vault, MediKhata, Sehat Card.

---

## 25. References

**ABDM / ABHA / FHIR**
- ABDM sandbox & developer docs (NHA) — M1/M2/M3, HIP/HIU/Consent Manager.
- ABDM ↔ FHIR developer intro: https://github.com/PSMRI/AMRIT-Docs/blob/main/architecture/integrations/abdm-fhir-developer-intro/README.md
- ABDM sandbox integration & exit process: https://docs.coronasafe.network/abdm-documentation/implementers-guide/abdm-sandbox-integration-and-exit-process
- ABDM FHIR integration guide (2026): https://www.adrine.in/blog/abdm-fhir-integration-guide-2026
- ABHA integration playbook (PM view): https://productgrowth.in/insights/healthtech/abha-integration-guide/

**DPDP / privacy**
- DPDP Act 2023 + Rules 2025 (EY): https://www.ey.com/en_in/insights/cybersecurity/decoding-the-digital-personal-data-protection-act-2023
- Consent framework under DPDP: https://ksandk.com/data-protection-and-data-privacy/consent-under-dpdp-act-2023-compliance-strategies/
- DPDP Rules 2025 (overview): https://en.wikipedia.org/wiki/Digital_Personal_Data_Protection_Rules,_2025

**Context / problem evidence**
- Indian medical record-keeping challenges (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC3238553/
- Bhashini (national language translation mission): https://bhashini.gov.in/
- WhatsApp Business Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- HL7 FHIR R4: https://hl7.org/fhir/R4/

---

*Companion docs in this workspace: `../product-ideas-research.md` (global), `../india-specific-software-opportunities.md` (India; SehatVault is idea #3, [ApnaParent] is #2 and the natural sister product).*
