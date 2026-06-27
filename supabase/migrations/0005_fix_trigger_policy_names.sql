-- 0005_fix_trigger_policy_names: two fixes from the 0004 drift.
--
-- 1. Trigger: health_record_check_family → check_hr_family_id (spec name).
-- 2. Storage policy: doc_select → doc_read (spec name).
--    The storage.objects table is owned by supabase_storage_admin, not postgres,
--    so ALTER POLICY RENAME is rejected on Supabase Cloud. We drop + recreate
--    under the correct name, guarded by existence checks for idempotency.
--    If doc_read already exists (clean 0004 applied), this section is a no-op.
--    If doc_select exists (old 0004 applied, rename via admin API), it is replaced.
--    If neither exists, the block silently succeeds (idempotent guard).

-- ── 1. Trigger rename (idempotent) ──────────────────────────────────────────────────
-- Only the old (drifted) 0004 created "health_record_check_family"; the clean 0004 now
-- creates "check_hr_family_id" directly. Guard so a fresh sequential replay (CI) — and a
-- prod where the rename already happened — both no-op instead of erroring on a missing trigger.
do $$
begin
  if exists (
    select 1 from pg_trigger
    where tgname = 'health_record_check_family'
      and tgrelid = 'public.health_record'::regclass
  ) then
    alter trigger health_record_check_family on public.health_record
      rename to check_hr_family_id;
    raise notice 'trigger health_record_check_family → check_hr_family_id (renamed)';
  else
    raise notice 'trigger health_record_check_family absent — skipping (0004 created check_hr_family_id directly)';
  end if;
end;
$$;

-- ── 2. Storage policy rename (idempotent via DROP/CREATE) ───────────────────────────
do $$
declare
  _sql text;
begin
  -- Already correct — nothing to do.
  if exists (
    select 1 from pg_policies where policyname = 'doc_read'
      and tablename = 'objects' and schemaname = 'storage'
  ) then
    raise notice 'storage policy doc_read already exists — skipping';
    return;
  end if;

  -- Old name exists — drop it and recreate under the correct name.
  if exists (
    select 1 from pg_policies where policyname = 'doc_select'
      and tablename = 'objects' and schemaname = 'storage'
  ) then
    -- Revoke old, then recreate with spec name (same USING clause as 0004).
    drop policy doc_select on storage.objects;

    create policy doc_read on storage.objects for select using (
      bucket_id = 'documents'
      and (storage.foldername(name))[1]::uuid in (select auth_family_ids())
    );

    raise notice 'storage policy doc_select → doc_read (renamed)';
    return;
  end if;

  -- Neither exists — this migration has nothing to do here.
  raise notice 'no storage policy rename needed';
end;
$$;
