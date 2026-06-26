-- 00_bootstrap_auth.sql — TEST / CI ONLY. Never applied to a real Supabase project.
--
-- A real Supabase database ships the `auth` schema, the `auth.uid()` helper, and the
-- `anon` / `authenticated` / `service_role` roles. A vanilla Postgres (CI's ephemeral
-- service container, or a local cluster) has none of these, so our PHI migrations —
-- which reference auth.users, auth.uid(), and the trigger on auth.users — cannot apply.
--
-- This file recreates the *minimum* of that surface so the migrations run unchanged and
-- RLS behaves exactly as it will in production:
--   * auth.users (only the columns handle_new_user() touches)
--   * auth.uid() reading request.jwt.claims, byte-for-byte the Supabase contract
--   * the three Supabase roles, with `authenticated` deliberately NOT a superuser and
--     NOT BYPASSRLS so that row-level security is actually enforced when we impersonate
--   * the default table grants Supabase gives anon/authenticated, so that a blocked write
--     is an RLS decision (the thing under test) and never a missing GRANT.
--
-- Apply order in CI/local: this file → supabase/migrations/*.sql → rls_isolation.test.sql

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

-- Mirrors Supabase's own auth.uid(): the current request's JWT `sub` claim, or NULL.
-- The inner nullif guards an unset/empty claims GUC (''::jsonb would otherwise error),
-- exactly as Supabase's own definition does.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    ''
  )::uuid
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    -- non-superuser, no BYPASSRLS: this is the role under which RLS is exercised
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end$$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;

-- Supabase grants table DML to anon/authenticated by default privilege. Replicate it so
-- the RLS test isolates the *policy* decision, not table-level GRANTs. Applies to the
-- public tables the migrations create after this point (created by the same role).
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
-- Supabase ALSO grants EXECUTE on new public functions directly to anon/authenticated (not
-- merely via PUBLIC). Mirror that so migration 0003's function-grant hardening is exercised
-- faithfully in CI — otherwise a regression that drops the revoke would pass unnoticed.
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ── Minimal Supabase Storage stub (TEST/CI ONLY) ─────────────────────────────────────────
-- Migration 0004 inserts into storage.buckets and creates policies on storage.objects.
-- These don't exist in vanilla Postgres; this stub recreates the minimum surface needed.
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id         uuid primary key default gen_random_uuid(),
  bucket_id  text references storage.buckets(id) on delete cascade,
  name       text,
  owner      uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  metadata   jsonb
);

alter table storage.objects enable row level security;

-- storage.foldername: returns all path segments except the last (filename).
-- 'family_id/member_id/record_id/file.pdf' → '{family_id,member_id,record_id}'
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end;
$$;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
