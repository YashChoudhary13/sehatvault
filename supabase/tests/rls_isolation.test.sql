-- rls_isolation.test.sql — the M0 gate (E1.S1.2.T7).
--
-- Proves the zero-leak invariant across every PHI table introduced in 0002_family.sql:
-- with family-B's JWT, family-A's app_user / family / member_profile rows are unreadable
-- AND unwritable (no SELECT, no UPDATE/DELETE reach, no INSERT/forge slips past WITH CHECK).
-- Positive controls confirm B can still see and write its OWN rows, so a green result is
-- genuine isolation and not a blanket denial (a missing GRANT would also block writes).
--
-- Mechanism: seed two users as the table owner (RLS bypassed), then `set role authenticated`
-- and drive request.jwt.claims to impersonate B — exactly how Supabase enforces RLS in prod.
-- Any failed assertion RAISEs, which (under psql -v ON_ERROR_STOP=1) aborts and fails CI.
--
-- Prereqs applied before this file: 00_bootstrap_auth.sql, then supabase/migrations/*.sql.
-- The whole test runs in one transaction and ROLLBACKs — safe to re-run on a live DB.

\set ON_ERROR_STOP on

begin;

-- Fixed identities so assertions can reference A's ids without B ever being able to read them.
\set user_a '00000000-0000-0000-0000-00000000000a'
\set user_b '00000000-0000-0000-0000-00000000000b'

-- Assertion helper (security invoker; callable by `authenticated`). Rolled back with the txn.
create function public.assert_rls(cond boolean, msg text)
returns void
language plpgsql
as $$
begin
  if cond is not true then
    raise exception 'RLS ISOLATION FAILED: %', msg;
  end if;
end;
$$;

-- ── Seed as the table owner (postgres ⇒ RLS bypassed). Triggers auto-provision
--    app_user + a default family per user; we add one member to each family. ──────────────
insert into auth.users (id, email) values
  (:'user_a', 'family-a@test.local'),
  (:'user_b', 'family-b@test.local');

insert into member_profile (family_id, display_name)
  values ((select id from family where owner_user_id = :'user_a'), 'Member A');
insert into member_profile (family_id, display_name)
  values ((select id from family where owner_user_id = :'user_b'), 'Member B');

-- Seed a health_record for family A so we can assert B cannot access it.
insert into health_record (member_id, family_id, title, ocr_status)
  select mp.id, mp.family_id, 'CBC Report A', 'pending'
  from member_profile mp
  join family f on f.id = mp.family_id
  where f.owner_user_id = :'user_a';

-- Stash A's ids in transaction-local GUCs so the impersonated blocks can target them
-- by value (B can never discover them through the API). (\o silences set_config echo.)
\o /dev/null
select set_config('test.family_a', (select id::text from family where owner_user_id = :'user_a'), true);
select set_config('test.member_a', (select mp.id::text
                                       from member_profile mp
                                       join family f on f.id = mp.family_id
                                      where f.owner_user_id = :'user_a'), true);
select set_config('test.health_record_a', (select hr.id::text
                                              from health_record hr
                                              join family f on f.id = hr.family_id
                                             where f.owner_user_id = :'user_a'), true);
select set_config('test.member_b', (select mp.id::text
                                       from member_profile mp
                                       join family f on f.id = mp.family_id
                                      where f.owner_user_id = :'user_b'), true);

-- ── Impersonate family-B ────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims',
                  json_build_object('sub', :'user_b', 'role', 'authenticated')::text,
                  true);
\o
set role authenticated;

-- READ isolation + positive controls
do $$
declare
  fam_a uuid := current_setting('test.family_a')::uuid;
  mem_a uuid := current_setting('test.member_a')::uuid;
  n int;
begin
  perform public.assert_rls(auth.uid() = '00000000-0000-0000-0000-00000000000b',
                            'impersonation: auth.uid() should resolve to B');

  -- positive controls: B sees exactly its own row in each table
  select count(*) into n from app_user;       perform public.assert_rls(n = 1, 'B should see only its own app_user');
  select count(*) into n from family;         perform public.assert_rls(n = 1, 'B should see only its own family');
  select count(*) into n from member_profile; perform public.assert_rls(n = 1, 'B should see only its own member');

  -- read isolation: A's rows are invisible
  select count(*) into n from app_user where id = '00000000-0000-0000-0000-00000000000a';
  perform public.assert_rls(n = 0, 'B must not read A''s app_user');
  select count(*) into n from family where id = fam_a;
  perform public.assert_rls(n = 0, 'B must not read A''s family');
  select count(*) into n from member_profile where family_id = fam_a;
  perform public.assert_rls(n = 0, 'B must not read A''s member_profile');
end$$;

-- WRITE isolation: UPDATE/DELETE against A's rows must reach 0 rows (invisible ⇒ no-op)
do $$
declare
  fam_a uuid := current_setting('test.family_a')::uuid;
  mem_a uuid := current_setting('test.member_a')::uuid;
  n int;
begin
  update family set name = 'hijacked' where id = fam_a;
  get diagnostics n = row_count;  perform public.assert_rls(n = 0, 'B UPDATE on A''s family must affect 0 rows');

  update member_profile set display_name = 'hijacked' where id = mem_a;
  get diagnostics n = row_count;  perform public.assert_rls(n = 0, 'B UPDATE on A''s member must affect 0 rows');

  update app_user set locale = 'hi' where id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;  perform public.assert_rls(n = 0, 'B UPDATE on A''s app_user must affect 0 rows');

  delete from member_profile where id = mem_a;
  get diagnostics n = row_count;  perform public.assert_rls(n = 0, 'B DELETE on A''s member must affect 0 rows');

  delete from family where id = fam_a;
  get diagnostics n = row_count;  perform public.assert_rls(n = 0, 'B DELETE on A''s family must affect 0 rows');
end$$;

-- WRITE isolation: INSERT/forge attempts must be rejected by RLS WITH CHECK (SQLSTATE 42501,
-- message names row-level security — distinguishing it from a mere missing GRANT).
do $$
declare
  fam_a uuid := current_setting('test.family_a')::uuid;
  blocked boolean;
  emsg text;
begin
  -- forge a member into A's family
  blocked := false;
  begin
    insert into member_profile (family_id, display_name) values (fam_a, 'injected');
  exception when insufficient_privilege then
    get stacked diagnostics emsg = message_text;
    blocked := emsg ilike '%row-level security%';
  end;
  perform public.assert_rls(blocked, 'B INSERT into A''s family must be blocked by RLS');

  -- forge a family owned by A
  blocked := false;
  begin
    insert into family (owner_user_id, name) values ('00000000-0000-0000-0000-00000000000a', 'forged');
  exception when insufficient_privilege then
    get stacked diagnostics emsg = message_text;
    blocked := emsg ilike '%row-level security%';
  end;
  perform public.assert_rls(blocked, 'B INSERT of a family owned by A must be blocked by RLS');

  -- privilege-escalation: reassign B's OWN family to A. Blocked because the post-update row
  -- (now owned by A) must still satisfy family's SELECT policy — Postgres enforces SELECT
  -- visibility on the new row of an UPDATE, on top of the UPDATE WITH CHECK.
  blocked := false;
  begin
    update family set owner_user_id = '00000000-0000-0000-0000-00000000000a' where owner_user_id = auth.uid();
  exception when insufficient_privilege then
    get stacked diagnostics emsg = message_text;
    blocked := emsg ilike '%row-level security%';
  end;
  perform public.assert_rls(blocked, 'B must not reassign its own family to A');
end$$;

-- Positive write control: B CAN write within its own family (proves the blocks above are
-- genuine RLS decisions, not a blanket denial from a missing privilege).
do $$
declare own_fam uuid; n int;
begin
  select id into own_fam from family;  -- RLS ⇒ only B's family is visible
  insert into member_profile (family_id, display_name) values (own_fam, 'B second member');
  select count(*) into n from member_profile;
  perform public.assert_rls(n = 2, 'B should be able to insert into its own family');
end$$;

-- Positive + negative control: app_lock_hash (PIN gate boundary).
-- Positive: B can set its own PIN hash (convenience re-entry gate, not an auth boundary).
-- Negative: explicit name in test output; proof is independent of the generic UPDATE block above.
do $$
declare n int;
begin
  update app_user set app_lock_hash = 'sentinel_hash' where id = auth.uid();
  get diagnostics n = row_count;
  perform public.assert_rls(n = 1, 'B should be able to set its own app_lock_hash');

  update app_user set app_lock_hash = 'stolen' where id = '00000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  perform public.assert_rls(n = 0, 'B must not overwrite A''s app_lock_hash');
end$$;

-- ── health_record: READ isolation + positive controls ──────────────────────────────────
do $$
declare
  fam_a uuid := current_setting('test.family_a')::uuid;
  hr_a  uuid := current_setting('test.health_record_a')::uuid;
  n int;
begin
  -- positive control: B sees exactly its own health_records (none seeded yet)
  select count(*) into n from health_record;
  perform public.assert_rls(n = 0, 'B should see 0 health_records (none in B''s family yet)');

  -- read isolation: A's record is invisible to B
  select count(*) into n from health_record where id = hr_a;
  perform public.assert_rls(n = 0, 'B must not read A''s health_record');

  select count(*) into n from health_record where family_id = fam_a;
  perform public.assert_rls(n = 0, 'B must not read any health_record in A''s family');
end$$;

-- ── health_record: WRITE isolation (UPDATE / DELETE must touch 0 rows) ─────────────────
do $$
declare
  hr_a uuid := current_setting('test.health_record_a')::uuid;
  n    int;
begin
  update health_record set title = 'hijacked' where id = hr_a;
  get diagnostics n = row_count;
  perform public.assert_rls(n = 0, 'B UPDATE on A''s health_record must affect 0 rows');

  delete from health_record where id = hr_a;
  get diagnostics n = row_count;
  perform public.assert_rls(n = 0, 'B DELETE on A''s health_record must affect 0 rows');
end$$;

-- ── health_record: INSERT forge must be blocked by RLS WITH CHECK ───────────────────────
do $$
declare
  fam_a   uuid := current_setting('test.family_a')::uuid;
  mem_a   uuid := current_setting('test.member_a')::uuid;
  blocked boolean;
  emsg    text;
begin
  blocked := false;
  begin
    insert into health_record (member_id, family_id, title)
      values (mem_a, fam_a, 'injected');
  exception when insufficient_privilege then
    get stacked diagnostics emsg = message_text;
    blocked := emsg ilike '%row-level security%';
  end;
  perform public.assert_rls(blocked, 'B INSERT into A''s family health_record must be blocked by RLS');
end$$;

-- ── health_record: positive write control — B CAN insert into its own family ───────────
do $$
declare
  own_fam uuid;
  mem_b   uuid := current_setting('test.member_b')::uuid;
  n       int;
begin
  select id into own_fam from family;  -- RLS ⇒ only B's family is visible
  insert into health_record (member_id, family_id, title, source)
    values (mem_b, own_fam, 'B ECG Report', 'upload');
  select count(*) into n from health_record;
  perform public.assert_rls(n = 1, 'B should be able to insert a health_record into its own family');
end$$;

-- Default-deny: with no identity (no JWT), nothing is readable.
\o /dev/null
select set_config('request.jwt.claims', '', true);
\o
do $$
declare n int;
begin
  perform public.assert_rls(auth.uid() is null, 'cleared claims ⇒ auth.uid() is null');
  select count(*) into n from family;         perform public.assert_rls(n = 0, 'no identity ⇒ 0 family rows (default deny)');
  select count(*) into n from member_profile; perform public.assert_rls(n = 0, 'no identity ⇒ 0 member rows (default deny)');
  select count(*) into n from app_user;       perform public.assert_rls(n = 0, 'no identity ⇒ 0 app_user rows (default deny)');
  select count(*) into n from health_record;  perform public.assert_rls(n = 0, 'no identity ⇒ 0 health_record rows (default deny)');
end$$;

-- Back to the owner: confirm none of B's attempts mutated A's data.
reset role;
do $$
declare n int;
begin
  select count(*) into n from member_profile
   where family_id = current_setting('test.family_a')::uuid and display_name = 'Member A';
  perform public.assert_rls(n = 1, 'A''s member must be intact after B''s attacks');

  select count(*) into n from family
   where id = current_setting('test.family_a')::uuid and name <> 'hijacked';
  perform public.assert_rls(n = 1, 'A''s family name must be unchanged after B''s attacks');

  select count(*) into n from health_record
   where family_id = current_setting('test.family_a')::uuid and title = 'CBC Report A';
  perform public.assert_rls(n = 1, 'A''s health_record must be intact after B''s attacks');
end$$;

-- Function-grant hardening (migration 0003): the SECURITY DEFINER helpers must not be
-- needlessly callable via the PostgREST RPC surface. handle_new_user is trigger-only;
-- auth_family_ids is RLS-only and must stay executable by authenticated but not anon.
do $$
begin
  perform public.assert_rls(not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
                            'anon must NOT execute handle_new_user (0003 hardening)');
  perform public.assert_rls(not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
                            'authenticated must NOT execute handle_new_user (0003 hardening)');
  perform public.assert_rls(not has_function_privilege('anon', 'public.auth_family_ids()', 'execute'),
                            'anon must NOT execute auth_family_ids (0003 hardening)');
  perform public.assert_rls(has_function_privilege('authenticated', 'public.auth_family_ids()', 'execute'),
                            'authenticated MUST execute auth_family_ids (RLS depends on it)');
end$$;

\echo '✓ RLS isolation: family-B cannot read or write family-A across app_user/family/member_profile'
\echo '✓ RLS isolation: family-B cannot read or write family-A''s health_record (0004)'
\echo '✓ app_lock_hash: B can set own PIN hash; cannot overwrite A''s'
\echo '✓ function-grant hardening (0003): RPC surface locked down on SECURITY DEFINER helpers'

rollback;
