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
