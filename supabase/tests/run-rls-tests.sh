#!/usr/bin/env bash
# run-rls-tests.sh — apply the auth stub + migrations + RLS isolation test to a Postgres
# of your choosing, exactly as CI does. Exits non-zero on any cross-family leak.
#
# Usage:
#   DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres ./run-rls-tests.sh
# or point at a throwaway DB via the standard PG* env vars (PGHOST/PGPORT/PGUSER/...).
#
# This runs against a *disposable* database: the bootstrap creates Supabase's auth stub and
# roles, and the test itself wraps everything in BEGIN/ROLLBACK. Do NOT point it at a real
# Supabase project — 00_bootstrap_auth.sql is for vanilla Postgres only.
set -euo pipefail

cd "$(dirname "$0")/../.."   # repo root

PSQL=(psql -v ON_ERROR_STOP=1)
[[ -n "${DATABASE_URL:-}" ]] && PSQL+=("$DATABASE_URL")

echo "→ bootstrap auth stub"
"${PSQL[@]}" -q -f supabase/tests/00_bootstrap_auth.sql

echo "→ apply migrations"
for f in supabase/migrations/*.sql; do
  echo "  $f"
  "${PSQL[@]}" -q -f "$f"
done

echo "→ RLS isolation test"
"${PSQL[@]}" -f supabase/tests/rls_isolation.test.sql
