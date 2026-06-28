# DB Migrations — Operator Runbook

> How to apply `supabase/migrations/*.sql` to the **production** Supabase project. There is no
> separate dev-only stack (ADR / Dev-Setup): this project treats one Supabase instance as prod.
> Migrations are **forward-only** and **sequentially numbered** (`0001`, `0002`, … — ADR-021),
> never timestamps. Never edit an applied migration; add the next-numbered file.

## Project

| | |
|---|---|
| Project ref | `lpyiuunahcqyigrtnjnm` (name `sehatvault`) |
| Region | `ap-south-1` |
| Postgres | 17 |
| Pooler | `aws-1-ap-south-1.pooler.supabase.com:5432` |

## Current remote state (2026-06-28)

`supabase_migrations.schema_migrations` on remote — `supabase migration list` shows
**local == remote for `0001`–`0006`** (all applied):

| version | name | status |
|---------|------|--------|
| 0001 | init | ✅ applied |
| 0002 | family | ✅ applied (tables `app_user`/`family`/`member_profile`, RLS + 11 policies, `auth_family_ids()`, signup trigger) |
| 0003 | harden_function_grants | ✅ applied |
| 0004 | health_records | ✅ applied (`health_record` + enums, pgmq guard, `documents` bucket + storage RLS) |
| 0005 | fix_trigger_policy_names | ✅ applied |
| 0006 | ai_pipeline | ✅ applied 2026-06-28 via `supabase db push` (pgvector + `pgmq_send` RPC + `lab_value`/`record_embedding`/`medication` + RLS 4-policies-each + `check_phi_family` trigger + `health_record` Realtime publication) |

History is clean sequential (the earlier timestamp-migration drift was repaired —
`migration repair` is **no longer needed**). `0006` was applied with `supabase db push`
(dry-run previewed, then pushed); the cached CLI session connected without a fresh token.

**Post-0006 advisor note:** the new PHI tables all have RLS enabled (4 policies each via
`auth_family_ids()`), and `pgmq_send` is `SECURITY DEFINER` but `EXECUTE` is revoked from
`public`/`anon` and granted only to `authenticated`/`service_role`. Re-check Dashboard →
Advisors → Security after deploy; the only expected residual is the pre-existing accepted
WARN for `auth_family_ids` / `authenticated` (see "After every push" below).

## Normal flow — apply pending migrations

```bash
# One-time per machine: authenticate + link the project
export SUPABASE_ACCESS_TOKEN=<personal access token>   # from https://supabase.com/dashboard/account/tokens
supabase link --project-ref lpyiuunahcqyigrtnjnm        # prompts for the DB password

# Preview what will be applied, then apply
supabase migration list      # shows local vs remote; pending rows have no remote entry
supabase db push             # applies every local migration not yet in remote history
supabase migration list      # confirm: local == remote for 0001..N
```

`supabase db push` matches **by version**: any local file whose `NNNN` prefix is not already a
remote `schema_migrations.version` is applied, in order, and recorded. It is safe to re-run —
already-applied versions are skipped.

### Required env / credentials
- `SUPABASE_ACCESS_TOKEN` — a Supabase personal access token (CLI auth).
- **Database password** — set during `supabase link` (or `SUPABASE_DB_PASSWORD`). This is the
  Postgres password from the dashboard → Project Settings → Database. Not stored in the repo.
- No app/anon/service keys are needed for migrations.

## After every push — verify

1. `supabase migration list` → local and remote match.
2. Security advisors (catches missing RLS, exposed `SECURITY DEFINER`, etc.):
   - Dashboard → Advisors → Security, or the Supabase MCP `get_advisors`.
   - **Expected residual after 0003:** one WARN — advisor `0029` for `auth_family_ids` /
     `authenticated`. This is **accepted by design**: the `member_profile` RLS policies call
     `auth_family_ids()`, so `authenticated` must keep `EXECUTE` (verified: revoking it breaks
     RLS with "permission denied for function auth_family_ids"). The function is self-scoped —
     it returns only `auth.uid()`'s own family ids — so direct RPC access leaks nothing.
3. RLS isolation gate runs in CI on every push (the `db` job: auth stub → migrations → test).
   To run it by hand against a **disposable** Postgres:
   `DATABASE_URL=postgres://…/scratch ./supabase/tests/run-rls-tests.sh`

## If `migration list` ever shows drift (history conflict)

Symptom: remote has a version the repo doesn't (e.g. a timestamp like `20260621031859`), or
vice-versa. **Do not edit applied migrations or hand-hack schema.** Instead realign history:

```bash
# Mark a stray remote version as reverted so push re-syncs to the sequential files:
supabase migration repair --status reverted <stray_version>
# Or mark a sequential file as already-applied if the objects exist but the row is missing:
supabase migration repair --status applied 000N
supabase db push
supabase migration list   # expect clean local == remote
```

## Note on out-of-band changes (MCP / SQL editor)

`0002` was applied to prod via the Supabase MCP `execute_sql` (the CLI DB password was not
available in the agent environment) and its `schema_migrations` row was inserted manually as
`0002`/`family`. The effect is identical to `supabase db push`; the next `db push` sees `0002`
as applied and is a no-op for it. Prefer `supabase db push` for all future migrations so the
recorded `statements`/history stay tool-generated and consistent.
