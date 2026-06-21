# Database Design — Schema, RLS, Storage

> Postgres (Supabase, `ap-south-1`). Relational, **FHIR-aware at the boundaries** (ADR-006), **single-owner families at MVP** (ADR-009). The migrations in `supabase/migrations/` are the real source of truth; this is the plan they implement.
>
> **Conventions:** PK `id uuid default gen_random_uuid()`. Instants = `timestamptz` (UTC). Calendar dates = `date` (e.g. `record_date = 2026-06-18`). Arrays = `text[]`. Money = `numeric`. Embeddings = `vector(n)`. `created_at`/`updated_at` on every table; `updated_at` via trigger. **Every PHI table carries `family_id` and has RLS.**

---

## 1. What we simplified vs the README data model

| README entity | MVP decision | Why |
|---|---|---|
| `user_account` | **Use Supabase `auth.users`** + a thin `app_user` row for app data (locale, app-lock) | Don't re-implement auth; one identity source. |
| `family_membership` (multi-family, roles, `member_scope`) | **Dropped at MVP**; single `family.owner_user_id`. Re-introduced in Phase 2 as `family_member_user` | Biggest RLS/complexity reducer (ADR-009). NRI sibling uses share links until then. |
| `member_profile` | **Keep** (this is the patient) | Core. |
| `health_record` | **Keep** + add `processing_*` status fields | Core. |
| `extracted_observation` | **Keep** as `observation` | Core; FHIR Observation. |
| `medication`, `condition`, `immunization` | **Keep** (immunization/condition are light at MVP) | Core but small. |
| `reminder` | **Keep** | Core. |
| `share_grant`, `access_log` | **Keep** (trust spine) | Core. |
| `record_embedding` | **Keep** (written Day 1, queried when Q&A ships) | ADR-011. |
| `abdm_consent` | **Deferred** (Phase 2 table) | ADR-013. |
| `subscription` | **Minimal stub**, used only when billing (Should) lands | Don't build billing tables before billing. |
| *(new)* `lab_catalog` | **Add** — canonical lab name ↔ LOINC ↔ unit lookup | Powers normalisation + trend grouping (M-12/M-14). |

Net: **~12 MVP tables** instead of 16, with the riskiest one (`family_membership`) removed.

---

## 2. ER overview (MVP)

```
auth.users (Supabase)
    │ 1:1
    ▼
 app_user ──owns──► family ──1:N──► member_profile ──1:N──► health_record
                                         │                      │ 1:N
                                         │                      ├─► observation ──ref──► lab_catalog
                                         │                      ├─► medication
                                         │                      ├─► condition
                                         │                      ├─► immunization
                                         │                      └─► record_embedding (pgvector)
                                         ├─1:N─► reminder
                                         └─1:N─► share_grant ──1:N──► access_log
 family ──1:1?──► subscription (stub)        (every PHI row also carries family_id)

 Phase 2 (not built at MVP): family_member_user, abdm_consent
```

**FHIR map (boundary only):** `member_profile`→Patient · `observation`→Observation · `medication`→MedicationStatement · `condition`→Condition · `immunization`→Immunization · `health_record`→DocumentReference. Mapping lives in `packages/core`, not in the DB.

---

## 3. Enums

```sql
create type record_type   as enum ('prescription','lab_report','scan','discharge','vaccination','bill','other');
create type record_source as enum ('manual','upload','whatsapp','abdm','lab_push');
create type ocr_status    as enum ('pending','processing','done','needs_review','failed','manual');
create type obs_flag      as enum ('low','normal','high','critical','unknown');
create type reminder_kind as enum ('medication','appointment','refill','test');
create type reminder_state as enum ('scheduled','fired','done','skipped','cancelled');
create type share_state   as enum ('active','expired','revoked');
create type sex_type      as enum ('male','female','other','unknown');
```

---

## 4. Core tables (DDL plan)

```sql
-- 4.1 app_user : app-level data keyed to Supabase auth
create table app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text,                       -- denormalised from auth for convenience
  locale      text not null default 'en', -- 'en' | 'hi' | ...
  elder_mode  boolean not null default false,
  app_lock_hash text,                     -- PIN hash (argon2), nullable
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 4.2 family : the account container (single owner at MVP)
create table family (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_user(id) on delete cascade,
  name          text not null default 'My Family',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on family(owner_user_id);

-- 4.3 member_profile : a person whose health we track (FHIR Patient)
create table member_profile (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid not null references family(id) on delete cascade,
  display_name  text not null,
  relationship  text,                      -- 'self','father','mother','spouse','son','daughter',...
  dob           date,
  sex           sex_type not null default 'unknown',
  blood_group   text,                      -- 'O+', 'AB-', ...
  allergies         text[] not null default '{}',
  chronic_conditions text[] not null default '{}',
  emergency_contact jsonb,                  -- { name, phone, relation }
  abha_id       text,                       -- Phase 2; nullable now
  photo_key     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on member_profile(family_id);

-- 4.4 health_record : an uploaded/observed document (FHIR DocumentReference)
create table health_record (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references member_profile(id) on delete cascade,
  family_id     uuid not null references family(id) on delete cascade,  -- denormalised for RLS speed
  type          record_type not null default 'other',
  source        record_source not null default 'upload',
  file_object_key text,                     -- storage path; null for pure manual entry
  page_count    int default 1,
  record_date   date,                       -- the clinical date (e.g. 2026-06-18)
  facility      text,
  doctor        text,
  title         text,                       -- e.g. 'CBC + HbA1c'
  summary       text,                       -- 1-line plain-language (AI), nullable
  summary_hi    text,
  ocr_status    ocr_status not null default 'pending',
  ocr_confidence numeric,                   -- 0..1 overall
  extracted     jsonb,                      -- raw LLM JSON (audit/debug)
  created_by    uuid references app_user(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on health_record(member_id, record_date desc);
create index on health_record(family_id);
create index on health_record(ocr_status) where ocr_status in ('pending','processing','needs_review');

-- 4.5 lab_catalog : canonical lab dictionary (reference data; no family_id)
create table lab_catalog (
  id           uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,      -- 'HbA1c'
  loinc_code   text,                        -- '4548-4'
  default_unit text,                        -- '%'
  aliases      text[] not null default '{}',-- {'Glycated Hemoglobin','A1C'}
  ref_low      numeric, ref_high numeric
);

-- 4.6 observation : a single lab value (FHIR Observation)
create table observation (
  id            uuid primary key default gen_random_uuid(),
  record_id     uuid not null references health_record(id) on delete cascade,
  member_id     uuid not null references member_profile(id) on delete cascade,
  family_id     uuid not null references family(id) on delete cascade,
  lab_catalog_id uuid references lab_catalog(id),  -- null if unmatched
  raw_name      text,                        -- 'Blood Sugar (F)' as printed
  canonical_name text,                       -- 'Fasting Glucose' if normalised
  loinc_code    text,
  value_num     numeric,
  value_text    text,                        -- for non-numeric results
  unit          text,
  ref_range     text,
  flag          obs_flag not null default 'unknown',
  observed_at   date,
  confidence    numeric,
  created_at    timestamptz not null default now()
);
create index on observation(member_id, canonical_name, observed_at);  -- trend queries

-- 4.7 medication (FHIR MedicationStatement)
create table medication (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references member_profile(id) on delete cascade,
  family_id   uuid not null references family(id) on delete cascade,
  record_id   uuid references health_record(id) on delete set null,
  drug_name   text not null,
  generic_name text,
  strength    text,                          -- '500 mg'
  frequency   text,                          -- 'BD' / 'twice daily'
  duration    text,                          -- '30 days'
  start_date  date, end_date date,
  active      boolean not null default true,
  confidence  numeric,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on medication(member_id, active);

-- 4.8 condition / immunization (light)
create table condition (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references member_profile(id) on delete cascade,
  family_id uuid not null references family(id) on delete cascade,
  name text not null, icd_code text, noted_at date,
  created_at timestamptz not null default now()
);
create table immunization (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references member_profile(id) on delete cascade,
  family_id uuid not null references family(id) on delete cascade,
  vaccine text not null, dose text, given_at date, due_at date,
  created_at timestamptz not null default now()
);

-- 4.9 reminder
create table reminder (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references member_profile(id) on delete cascade,
  family_id    uuid not null references family(id) on delete cascade,
  medication_id uuid references medication(id) on delete set null,
  kind         reminder_kind not null,
  title        text not null,
  schedule_rrule text,                        -- RRULE; or null for one-off
  next_fire_at timestamptz,
  channels     text[] not null default '{inapp}',  -- {'inapp','webpush','whatsapp'}
  state        reminder_state not null default 'scheduled',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on reminder(next_fire_at) where state = 'scheduled';

-- 4.10 share_grant : scoped, time-limited doctor share
create table share_grant (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references family(id) on delete cascade,
  member_id   uuid not null references member_profile(id) on delete cascade,
  created_by  uuid not null references app_user(id),
  token_hash  text not null unique,          -- store HASH, not the raw token
  scope       jsonb not null,                -- { types:[], date_from, date_to, include_docs:true }
  state       share_state not null default 'active',
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index on share_grant(family_id, state);

-- 4.11 access_log : immutable audit trail (append-only)
create table access_log (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references family(id) on delete cascade,
  member_id    uuid references member_profile(id) on delete set null,
  share_grant_id uuid references share_grant(id) on delete set null,
  actor        text not null,                 -- 'user:<uid>' | 'share-link' | 'system'
  action       text not null,                 -- 'view_record','open_share','export','delete',...
  meta         jsonb,                         -- { ip_trunc, ua, record_id }
  at           timestamptz not null default now()
);
create index on access_log(family_id, at desc);
create index on access_log(share_grant_id);

-- 4.12 record_embedding : RAG (pgvector)
create table record_embedding (
  id         uuid primary key default gen_random_uuid(),
  record_id  uuid not null references health_record(id) on delete cascade,
  member_id  uuid not null references member_profile(id) on delete cascade,
  family_id  uuid not null references family(id) on delete cascade,
  chunk      text not null,
  embedding  vector(1024),                    -- dim per chosen embedding model
  created_at timestamptz not null default now()
);
create index on record_embedding using hnsw (embedding vector_cosine_ops);

-- 4.13 subscription : stub (only used when billing/Should ships)
create table subscription (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references family(id) on delete cascade,
  plan text not null default 'free',          -- 'free' | 'plus' | 'nri'
  status text not null default 'active',
  provider_ref text, renews_at timestamptz,
  created_at timestamptz not null default now()
);
```

---

## 5. RLS — the security spine (ADR-005, Risks.md T4)

**Principle: default-deny, owner-scoped, helper-driven.** Enable RLS on every PHI table; no table is readable without an explicit policy.

```sql
-- Helper: families the current user owns (STABLE, SECURITY DEFINER for plan caching)
create or replace function auth_family_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select id from family where owner_user_id = auth.uid()
$$;

-- Pattern applied to EVERY PHI table (example: health_record)
alter table health_record enable row level security;

create policy hr_select on health_record for select
  using (family_id in (select auth_family_ids()));
create policy hr_insert on health_record for insert
  with check (family_id in (select auth_family_ids()));
create policy hr_update on health_record for update
  using (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));
create policy hr_delete on health_record for delete
  using (family_id in (select auth_family_ids()));
```

- The **same four policies** are generated for `member_profile`, `observation`, `medication`, `condition`, `immunization`, `reminder`, `share_grant`, `record_embedding`, `subscription` — all keyed on `family_id in (select auth_family_ids())`. `member_profile` keys on its own `family_id`; `family` keys on `owner_user_id = auth.uid()`.
- **`access_log`:** `select` allowed to the owner; **no** client `insert/update/delete` — only the **service role** (server/worker) appends. This keeps the audit trail immutable from the client.
- **`lab_catalog`:** read-only reference data — `select` to all authenticated; writes service-role only.
- **Service role** (server/worker) bypasses RLS by design; it is used **only** in server code and the Python worker, **never** shipped to the browser. The browser uses the anon key + the user's JWT, so RLS always applies client-side.
- **`needs_review` writes** by the worker and the AI callback use the service role but still **stamp `family_id`** from the record being processed.

**CI invariant:** an automated test seeds family A and family B and asserts that, using B's JWT, every table returns **zero** of A's rows for select and **rejects** insert/update/delete into A. Adding a table without this test fails CI.

---

## 6. Storage structure (documents)

- **Bucket** `documents` — **private** (no public access), region `ap-south-1`.
- **Key layout:** `documents/{family_id}/{member_id}/{record_id}/{n}.{ext}` — family_id is the first path segment so storage RLS can authorize on it.

```sql
-- Storage RLS: a user may access an object only if the first folder is a family they own
create policy doc_read on storage.objects for select
  using ( bucket_id = 'documents'
          and (storage.foldername(name))[1]::uuid in (select auth_family_ids()) );
-- analogous insert/delete policies with the same check
```

- **Delivery:** the browser never gets a permanent URL. The server checks DB permission, then issues a **short-lived signed URL** (e.g. 60s) for that exact object. Doctor-share documents are served the same way, gated by a valid, unexpired `share_grant`.
- **Encryption:** at rest by Supabase (AES-256); in transit TLS. No app-layer envelope encryption at MVP (ADR-012).

---

## 7. Triggers & integrity
- `set_updated_at()` BEFORE UPDATE trigger on every table with `updated_at`.
- **Audit triggers** are *not* used for reads (reads are logged in app code where context exists); deletes/exports are logged explicitly by the server.
- `health_record.family_id` must equal `member_profile.family_id` — enforced by a check via trigger (cheap) to prevent denormalisation drift.
- **Cascade deletes** from `family` → everything (supports DPDP erasure: delete the family row → all PHI + storage objects removed by a coordinated server routine).

---

## 8. Phase-2 tables (named, not built)
- `family_member_user(family_id, user_id, role)` — co-caregiver access; flips `auth_family_ids()` to include memberships.
- `abdm_consent(member_id, abha_id, consent_artefact_id, scope, status, granted_at, expires_at)` — HIU consent records.
- `lab_push_source`, `hip_link` — Phase-2 integrations.

Designing `auth_family_ids()` as the single choke-point means adding co-caregivers later is a **one-function change**, not a rewrite of every policy.
