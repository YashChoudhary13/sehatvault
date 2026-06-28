-- 0006_ai_pipeline: M2 AI pipeline. pgvector + enqueue RPC + lab_value, record_embedding,
-- medication tables (all RLS, denormalised family_id). health_record is unchanged.
-- Guards mirror 0004's pgmq pattern so vanilla Postgres / CI still loads this file.

-- ── 1. pgvector (Supabase has it; guard for vanilla PG / CI) ──────────────────────────────
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'vector') then
    create extension if not exists vector;
  end if;
end;
$$;

-- ── 2. Enqueue wrapper so the BFF (PostgREST RPC) can push pgmq jobs ──────────────────────
-- The ingest route runs as the authenticated user; pgmq schema is not exposed via PostgREST,
-- so this SECURITY DEFINER wrapper is the choke-point. No-ops cleanly where pgmq is absent.
create or replace function public.pgmq_send(p_queue_name text, p_message jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  msg_id bigint;
begin
  if not exists (select 1 from pg_extension where extname = 'pgmq') then
    return null;  -- CI / vanilla PG: enqueue is a no-op (worker not run there)
  end if;
  select pgmq.send(p_queue_name, p_message) into msg_id;
  return msg_id;
end;
$$;

revoke all on function public.pgmq_send(text, jsonb) from public, anon;
grant execute on function public.pgmq_send(text, jsonb) to authenticated, service_role;

-- ── 3. lab_value — typed analytes feeding trend charts ───────────────────────────────────
create table lab_value (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references family(id) on delete cascade,
  record_id   uuid not null references health_record(id) on delete cascade,
  member_id   uuid not null references member_profile(id) on delete cascade,
  analyte     text not null,            -- canonical key, e.g. 'hba1c'
  value       numeric not null,
  unit        text,
  measured_at date,
  ref_low     numeric,
  ref_high    numeric,
  flag        text,                     -- 'low' | 'high' | 'normal' | null
  created_at  timestamptz not null default now()
);
create index lab_value_member_analyte_idx on lab_value(member_id, analyte, measured_at);
create index lab_value_family_idx on lab_value(family_id);
create index lab_value_record_idx on lab_value(record_id);

-- ── 4. record_embedding — pgvector chunks for future RAG (written now, UI later: ADR-011) ─
create table record_embedding (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references family(id) on delete cascade,
  record_id  uuid not null references health_record(id) on delete cascade,
  member_id  uuid not null references member_profile(id) on delete cascade,
  chunk      text not null,
  embedding  vector(768),              -- text-embedding-004; change with EMBEDDING_MODEL
  created_at timestamptz not null default now()
);
create index record_embedding_record_idx on record_embedding(record_id);
create index record_embedding_family_idx on record_embedding(family_id);

-- ── 5. medication — parsed from prescriptions ────────────────────────────────────────────
create table medication (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references family(id) on delete cascade,
  member_id  uuid not null references member_profile(id) on delete cascade,
  record_id  uuid references health_record(id) on delete set null,
  name       text not null,
  dose       text,
  frequency  text,
  active     boolean not null default true,
  started_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index medication_member_idx on medication(member_id) where active;
create index medication_family_idx on medication(family_id);
create trigger medication_set_updated_at before update on medication
  for each row execute function set_updated_at();

-- ── 6. Denorm integrity: family_id must match the member's family (mirrors 0004) ─────────
create or replace function check_phi_family()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.family_id <> (select family_id from public.member_profile where id = new.member_id) then
    raise exception 'family_id must match member_profile.family_id (denorm drift prevented)';
  end if;
  return new;
end;
$$;
create trigger lab_value_family_chk        before insert or update on lab_value        for each row execute function check_phi_family();
create trigger record_embedding_family_chk before insert or update on record_embedding for each row execute function check_phi_family();
create trigger medication_family_chk       before insert or update on medication       for each row execute function check_phi_family();

-- ── 7. RLS — default-deny, 4 policies each, keyed via auth_family_ids() ───────────────────
alter table lab_value        enable row level security;
alter table record_embedding enable row level security;
alter table medication       enable row level security;

create policy lab_value_select on lab_value for select using (family_id in (select auth_family_ids()));
create policy lab_value_insert on lab_value for insert with check (family_id in (select auth_family_ids()));
create policy lab_value_update on lab_value for update using (family_id in (select auth_family_ids())) with check (family_id in (select auth_family_ids()));
create policy lab_value_delete on lab_value for delete using (family_id in (select auth_family_ids()));

create policy record_embedding_select on record_embedding for select using (family_id in (select auth_family_ids()));
create policy record_embedding_insert on record_embedding for insert with check (family_id in (select auth_family_ids()));
create policy record_embedding_update on record_embedding for update using (family_id in (select auth_family_ids())) with check (family_id in (select auth_family_ids()));
create policy record_embedding_delete on record_embedding for delete using (family_id in (select auth_family_ids()));

create policy medication_select on medication for select using (family_id in (select auth_family_ids()));
create policy medication_insert on medication for insert with check (family_id in (select auth_family_ids()));
create policy medication_update on medication for update using (family_id in (select auth_family_ids())) with check (family_id in (select auth_family_ids()));
create policy medication_delete on medication for delete using (family_id in (select auth_family_ids()));

-- ── 8. Realtime: let the web client subscribe to health_record status flips ──────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table health_record;
    exception when duplicate_object then null;
    end;
  end if;
end;
$$;
