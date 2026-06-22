-- 0002_family: identity + family + member profiles, with RLS (Sprint 2 / M0 gate).
-- Single-owner families (ADR-009). Email OTP auth (ADR-019) — app_user mirrors auth.users email.
-- Every PHI table carries family_id and is default-deny RLS, keyed via auth_family_ids().

-- 1. Enums (only what these tables need; record/obs enums land with later migrations)
create type sex_type as enum ('male', 'female', 'other', 'unknown');

-- 2. app_user : app-level data keyed 1:1 to Supabase auth.users
create table app_user (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,                         -- denormalised from auth for convenience
  locale        text not null default 'en',   -- 'en' | 'hi'
  elder_mode    boolean not null default false,
  app_lock_hash text,                          -- PIN hash (argon2), set client-side; nullable
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. family : the account container (single owner at MVP)
create table family (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references app_user(id) on delete cascade,
  name          text not null default 'My Family',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index family_owner_idx on family(owner_user_id);

-- 4. member_profile : a person whose health we track (FHIR Patient at the boundary)
create table member_profile (
  id                 uuid primary key default gen_random_uuid(),
  family_id          uuid not null references family(id) on delete cascade,
  display_name       text not null,
  relationship       text,                     -- 'self','father','mother','spouse','son','daughter',...
  dob                date,
  sex                sex_type not null default 'unknown',
  blood_group        text,                     -- 'O+', 'AB-', ...
  allergies          text[] not null default '{}',
  chronic_conditions text[] not null default '{}',
  emergency_contact  jsonb,                    -- { name, phone, relation }
  abha_id            text,                     -- Phase 2; nullable now
  photo_key          text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index member_profile_family_idx on member_profile(family_id);

-- 5. updated_at triggers (set_updated_at() defined in 0001_init)
create trigger app_user_set_updated_at       before update on app_user       for each row execute function set_updated_at();
create trigger family_set_updated_at         before update on family         for each row execute function set_updated_at();
create trigger member_profile_set_updated_at before update on member_profile for each row execute function set_updated_at();

-- 6. auth_family_ids() : the single RLS choke-point — families the current user owns.
--    SECURITY DEFINER + pinned empty search_path (Supabase linter 0011); fully schema-qualified.
create or replace function auth_family_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.family where owner_user_id = auth.uid()
$$;

-- 7. Auto-provision app_user + a default family on signup (first email-OTP verify).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.app_user (id, email) values (new.id, new.email);
  insert into public.family (owner_user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 8. RLS — default-deny, owner-scoped. Enable + four policies per table.
alter table app_user       enable row level security;
alter table family         enable row level security;
alter table member_profile enable row level security;

-- app_user: a user sees/edits only their own row (no client delete — cascades from auth.users)
create policy app_user_select on app_user for select using (id = auth.uid());
create policy app_user_insert on app_user for insert with check (id = auth.uid());
create policy app_user_update on app_user for update using (id = auth.uid()) with check (id = auth.uid());

-- family: owner-scoped
create policy family_select on family for select using (owner_user_id = auth.uid());
create policy family_insert on family for insert with check (owner_user_id = auth.uid());
create policy family_update on family for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy family_delete on family for delete using (owner_user_id = auth.uid());

-- member_profile: scoped via auth_family_ids()
create policy member_profile_select on member_profile for select using (family_id in (select auth_family_ids()));
create policy member_profile_insert on member_profile for insert with check (family_id in (select auth_family_ids()));
create policy member_profile_update on member_profile for update using (family_id in (select auth_family_ids())) with check (family_id in (select auth_family_ids()));
create policy member_profile_delete on member_profile for delete using (family_id in (select auth_family_ids()));
