-- 0001_init: baseline only.
-- pgcrypto provides gen_random_uuid(); set_updated_at() is the shared updated_at trigger fn
-- (search_path pinned per Supabase security linter 0011 — trust-by-default).
-- Feature extensions (pgvector, pg_cron, pgmq) are enabled by the migrations that first
-- need them (M2 queue / M3 cron). No PHI tables and no RLS in PR1 (those land in PR2).

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
