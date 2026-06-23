-- 0003_harden_function_grants: tighten EXECUTE on the SECURITY DEFINER functions from 0002
-- so they are not needlessly reachable through the PostgREST RPC surface
-- (/rest/v1/rpc/<fn>). Resolves Supabase security advisors 0028/0029. Forward-only.
--
-- NB: Supabase grants EXECUTE on new public functions DIRECTLY to anon/authenticated (and
-- service_role), not just via PUBLIC. So we revoke from those roles explicitly — revoking
-- from PUBLIC alone is a no-op on a real Supabase project.

-- handle_new_user(): a trigger function only. A trigger fires without checking EXECUTE on the
-- triggering role, so dropping every grant keeps signup auto-provisioning working while
-- removing the function from the callable API entirely. No role needs it back.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- auth_family_ids(): the RLS choke-point. `authenticated` MUST retain EXECUTE — the
-- member_profile policies call it, and without it queries fail with "permission denied for
-- function auth_family_ids" (verified). It is self-scoped (returns only auth.uid()'s own
-- family ids), so authenticated RPC access is benign. anon/public are dropped; the residual
-- advisor 0029 (authenticated can execute) is accepted by design — it is required by RLS.
revoke execute on function public.auth_family_ids() from public, anon;
grant  execute on function public.auth_family_ids() to authenticated;