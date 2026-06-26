-- 0004_health_records: health_record table with enums, indexes, denorm integrity check,
-- updated_at trigger, and RLS; pgmq job queue (Supabase only — guarded for vanilla Postgres);
-- private 'documents' Storage bucket + Storage RLS policies. (Sprint 4 / M1)

-- ── 1. Enums ─────────────────────────────────────────────────────────────────────────────
create type record_type   as enum ('prescription','lab_report','scan','discharge','vaccination','bill','other');
create type record_source as enum ('manual','upload','whatsapp','abdm','lab_push');
create type ocr_status    as enum ('pending','processing','done','needs_review','failed','manual');

-- ── 2. pgmq async job queue (Supabase only; skipped on vanilla Postgres / CI) ───────────
-- The ingest route enqueues an 'ai_jobs' message; the Python worker drains it.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pgmq') then
    create extension if not exists pgmq;
    perform pgmq.create('ai_jobs');
  end if;
end;
$$;

-- ── 3. health_record (FHIR DocumentReference) ────────────────────────────────────────────
create table health_record (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references member_profile(id) on delete cascade,
  family_id       uuid not null references family(id) on delete cascade,  -- denormalised for RLS speed
  type            record_type   not null default 'other',
  source          record_source not null default 'upload',
  file_object_key text,                     -- storage path; null for pure manual entry
  page_count      int default 1,
  record_date     date,                     -- the clinical date (e.g. 2026-06-18)
  facility        text,
  doctor          text,
  title           text,
  summary         text,                     -- 1-line plain-language (AI), nullable
  summary_hi      text,
  ocr_status      ocr_status not null default 'pending',
  ocr_confidence  numeric,                  -- 0..1 overall confidence
  extracted       jsonb,                    -- raw LLM JSON (audit/debug only; never logged)
  created_by      uuid references app_user(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index health_record_member_date_idx on health_record(member_id, record_date desc);
create index health_record_family_idx      on health_record(family_id);
create index health_record_ocr_queue_idx   on health_record(ocr_status)
  where ocr_status in ('pending', 'processing', 'needs_review');

-- ── 4. Denorm integrity: health_record.family_id must equal member_profile.family_id ─────
-- Guards against drift between the denormalised family_id and the member's actual family.
create or replace function check_health_record_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.family_id <> (
    select family_id from public.member_profile where id = new.member_id
  ) then
    raise exception
      'health_record.family_id must match member_profile.family_id (denorm drift prevented)';
  end if;
  return new;
end;
$$;

create trigger check_hr_family_id
  before insert or update on health_record
  for each row execute function check_health_record_family();

-- ── 5. updated_at trigger ────────────────────────────────────────────────────────────────
create trigger health_record_set_updated_at
  before update on health_record
  for each row execute function set_updated_at();

-- ── 6. RLS — default-deny, four policies, keyed via auth_family_ids() ───────────────────
alter table health_record enable row level security;

create policy hr_select on health_record for select
  using (family_id in (select auth_family_ids()));
create policy hr_insert on health_record for insert
  with check (family_id in (select auth_family_ids()));
create policy hr_update on health_record for update
  using  (family_id in (select auth_family_ids()))
  with check (family_id in (select auth_family_ids()));
create policy hr_delete on health_record for delete
  using (family_id in (select auth_family_ids()));

-- ── 7. Supabase Storage: private 'documents' bucket ─────────────────────────────────────
-- Key layout: {family_id}/{member_id}/{record_id}/{n}.{ext}
-- public = false means all delivery goes through short-lived signed URLs (≤60 s).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'documents',
  'documents',
  false,
  52428800,   -- 50 MiB per file
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
where not exists (select 1 from storage.buckets where id = 'documents');

-- ── 8. Storage RLS: user may access objects only under a family they own ─────────────────
-- (storage.foldername(name))[1] is the first path segment (family_id).
alter table storage.objects enable row level security;

create policy doc_read on storage.objects for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select auth_family_ids())
  );

create policy doc_insert on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select auth_family_ids())
  );

create policy doc_delete on storage.objects for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1]::uuid in (select auth_family_ids())
  );
