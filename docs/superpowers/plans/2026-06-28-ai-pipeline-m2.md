# AI Pipeline (M2 / Sprint 7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upload a synthetic medical document → a Python worker reads, classifies, normalises, embeds, and summarises it → the record flips `pending → processing → done` live on the member timeline with typed lab values, a plain-language summary, and a stored embedding.

**Architecture:** A stateless Python FastAPI worker (`services/ai/`) runs an asyncio **pgmq drain loop**, pulling `health_record.id` jobs, running six pure-ish pipeline stages, and POSTing an HMAC-signed result to a new Next.js route (`/api/ai/callback`) which performs all DB writes with the service-role key. Migration `0006` adds pgvector + three RLS-protected tables (`lab_value`, `record_embedding`, `medication`) and the missing `pgmq_send` enqueue RPC. The web UI subscribes to `health_record` changes via Supabase Realtime and renders processing/review/error states.

**Tech Stack:** Python 3.12 + FastAPI + uvicorn + asyncpg + `openai` SDK (provider-agnostic) + `pdf2image`/`Pillow` (PDF→image) · TypeScript/Next.js 15 Route Handler + zod · Postgres 17 (pgmq, pgvector) · pytest · Vitest.

## Global Constraints

Copied verbatim from the spec and project CLAUDE.md — every task implicitly includes these:

- **DEMO posture = real, working — NOT mocked.** All six stages genuinely run. The only transient stub is the build-order scaffold in Tasks 2–3, removed by Task 5.
- **Synthetic / de-identified documents only.** No real patient PHI through free third-party models until T5 (zero-retention/DPA) is done.
- **Never log document contents, tokens, or PHI field values.** Log IDs, statuses, durations — never extracted text/values.
- **Service-role key = server/worker only.** Never `NEXT_PUBLIC_*`, never shipped to the browser. The worker (asyncpg) and `/api/ai/callback` are the only service-role consumers.
- **No secrets committed.** `.env.example` gets names only; `OPENAI_API_KEY` is left **blank** (user pastes Gemini key later).
- **Every new PHI table gets 4 RLS policies via `auth_family_ids()` + an isolation test in the same PR.** CI `db` job must stay green. `family_id` denormalised onto every PHI table.
- **Migrations forward-only, sequentially named** (`0006_…`, not timestamps). Never edit an applied migration.
- **Default provider: Google Gemini** via OpenAI-compatible endpoint (`OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/`, `EXTRACTION_MODEL=gemini-2.5-flash`, `SUMMARY_MODEL=gemini-2.5-flash`, `EMBEDDING_MODEL=text-embedding-004`, 768-dim). Fallback: FreeLLMAPI (`http://localhost:3001/v1`). Provider isolated in `app/llm.py` — swap = env change only.
- **Design-as-you-build (Dev Rule 13).** UI states use Calm Indigo tokens + `@sehatvault/ui` primitives + Lucide icons (never emoji), en/hi via `t()`, empty/loading/error states, responsive 375/768/1024/1440, `prefers-reduced-motion` + elder mode, status by icon+label (never colour alone). Pixel-verify via agent-browser before claiming done.

## Existing codebase anchors (do not re-derive)

- RLS choke-point: `auth_family_ids()` returns `setof uuid` of families the JWT owner owns (`0002_family.sql:55`). `SECURITY DEFINER`, `search_path=''`.
- `set_updated_at()` trigger fn defined in `0001_init.sql`; attach to every table with `updated_at`.
- 4-policy RLS pattern (verbatim shape to mirror): see `0004_health_records.sql:80-88`.
- Denorm-integrity trigger pattern: `check_health_record_family()` in `0004_health_records.sql:51-70`.
- pgmq guarded-create pattern (Supabase-only, CI-safe): `0004_health_records.sql:12-19`.
- `health_record` already has `summary`, `summary_hi`, `extracted jsonb`, `ocr_status`, `ocr_confidence`, `file_object_key`, `page_count`. **No changes to `health_record` columns.**
- RLS isolation harness: `supabase/tests/rls_isolation.test.sql` (sets `test.family_a`, JWT-switches roles, `public.assert_rls(...)`); bootstrap in `supabase/tests/00_bootstrap_auth.sql`; runner `supabase/tests/run-rls-tests.sh`.
- Ingest route: `apps/web/src/app/api/ingest/route.ts` — already inserts `health_record(pending)` and **attempts** `supabase.rpc("pgmq_send", { p_queue_name, p_message })`. That RPC does not exist yet (Task 1 adds it; Task 1 also aligns the call).
- Web Supabase clients: `apps/web/src/lib/supabase/server.ts` (anon+cookies), `client.ts` (browser). No service-role client factory exists yet — Task 2 adds `lib/supabase/service.ts`.
- env validation: `apps/web/src/lib/env.ts` (zod, client vars only).
- File storage key layout: `{family_id}/{uuid}-{name}` in private `documents` bucket; delivery via ≤60 s signed URLs.

---

## File Structure

**New Python service** (`services/ai/` — NOT a pnpm workspace; own venv):
- `services/ai/pyproject.toml` — deps + pytest config.
- `services/ai/.env.example` — names only, key blank.
- `services/ai/app/main.py` — FastAPI app, `/healthz`, drain-loop lifespan task.
- `services/ai/app/config.py` — env settings (pydantic-settings).
- `services/ai/app/db.py` — asyncpg pool + pgmq read/delete/archive helpers.
- `services/ai/app/llm.py` — provider wrapper (chat + vision + embeddings).
- `services/ai/app/callback.py` — HMAC-signed POST to Next callback.
- `services/ai/app/worker.py` — `process_job(record_id)` orchestration over the six stages.
- `services/ai/app/pipeline/__init__.py`
- `services/ai/app/pipeline/preprocess.py` — Storage fetch + PDF→images.
- `services/ai/app/pipeline/extract.py` — vision LLM → strict JSON.
- `services/ai/app/pipeline/classify.py` — map/validate `type` → `record_type` enum.
- `services/ai/app/pipeline/normalise.py` — raw values → canonical analytes/units (pure).
- `services/ai/app/pipeline/embed.py` — embeddings → vectors.
- `services/ai/app/pipeline/summarise.py` — text LLM → `summary` + `summary_hi`.
- `services/ai/app/schemas.py` — pydantic models for stage I/O + callback payload.
- `services/ai/tests/` — pytest: `test_normalise.py`, `test_classify.py`, `test_callback_contract.py`, `test_summarise.py`, `test_eval_scoring.py`, `conftest.py`.
- `services/ai/eval/` — T1 golden set (Task 9).

**New DB migration:**
- `supabase/migrations/0006_ai_pipeline.sql` — pgvector + `pgmq_send` RPC + `lab_value` + `record_embedding` + `medication` + RLS + Realtime publication.
- `supabase/tests/rls_isolation.test.sql` — MODIFY: add isolation blocks for the three new tables.

**New / modified web files:**
- `apps/web/src/lib/supabase/service.ts` — CREATE: service-role client factory.
- `apps/web/src/lib/env.ts` — MODIFY: add server-side env (service-role key, callback secret).
- `apps/web/src/app/api/ai/callback/route.ts` — CREATE: HMAC-verified result sink.
- `apps/web/src/app/api/ingest/route.ts` — MODIFY: align `pgmq_send` call to the new RPC signature.
- `apps/web/src/components/records/processing-card.tsx` — CREATE: pending/processing/needs_review/failed states.
- `apps/web/src/components/records/use-record-realtime.ts` — CREATE: Realtime subscription hook + poll fallback.
- `apps/web/src/app/(app)/records/[id]/_record-client.tsx` — MODIFY: wire realtime + states.
- `apps/web/src/app/(app)/members/[id]/trends/page.tsx` — CREATE: lab-value trend chart page (Task 5).
- `packages/core/src/lab.ts` + `packages/core/src/lab.test.ts` — CREATE: shared analyte canon (units/ref-ranges) reused by trends UI.
- `packages/i18n/src/en.json` + `hi.json` — MODIFY: `records.processing.*`, `records.review.*`, `trends.*` keys.
- `.env.example` — MODIFY: rename AI vars to the provider-agnostic set.

**Provenance note:** `record_embedding.embedding` is `vector(768)` because `EMBEDDING_MODEL=text-embedding-004`. If the model changes, the dimension and migration change together.

---

## Build order (each task ends at a demoable boundary)

Task 1 → enqueue works. Task 2 → worker drains + stub callback (spine, pending→done with stub). Task 3 → real reading (preprocess+extract+classify). Task 4 → schema+RLS+callback persists structured data. Task 5 → normalise→lab_value→trend chart. Task 6 → embeddings. Task 7 → summaries. Task 8 → realtime UI. Task 9 → eval set + accuracy pass. Task 10 → docs/status.

---

### Task 1: Fix the enqueue path — `pgmq_send` RPC (DB only, no worker yet)

The ingest route already tries to enqueue but the RPC is missing, so jobs are silently dropped. Make enqueue real before building the consumer.

**Files:**
- Create: `supabase/migrations/0006_ai_pipeline.sql` (this task adds ONLY the pgvector guard + `pgmq_send` RPC; later tasks append tables — keep it one migration file, appended in order).
- Modify: `apps/web/src/app/api/ingest/route.ts` (align the RPC call).

**Interfaces:**
- Produces SQL function `public.pgmq_send(p_queue_name text, p_message jsonb) returns bigint` — callable by `authenticated` (the ingest route runs as the user). Internally calls `pgmq.send`. Guarded so vanilla-PG/CI (no pgmq) still loads the migration.

- [ ] **Step 1: Write the migration header + pgvector guard + enqueue RPC**

Create `supabase/migrations/0006_ai_pipeline.sql`:

```sql
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
```

- [ ] **Step 2: Align the ingest RPC call to the new signature**

In `apps/web/src/app/api/ingest/route.ts`, replace the enqueue block (the `supabase.rpc("pgmq_send", …)` try/catch) with:

```ts
  // Enqueue a job for the AI worker via pgmq (wrapper RPC defined in 0006).
  const { error: rpcError } = await supabase.rpc("pgmq_send", {
    p_queue_name: "ai_jobs",
    p_message: { record_id: recordId },
  });
  if (rpcError) {
    // Record is saved as 'pending'; surface enqueue failure for observability but don't fail the upload.
    console.error("[ingest] enqueue failed", rpcError.code);
  }
```

- [ ] **Step 3: Apply the migration to a disposable Postgres and verify it loads**

Run: `supabase/tests/run-rls-tests.sh`
Expected: existing isolation suite still passes (the runner globs all `migrations/*.sql`; `pgmq_send` compiles via the no-pgmq branch).

- [ ] **Step 4: Typecheck the web change**

Run: `pnpm --filter web typecheck`
Expected: PASS (the RPC arg type is `Json`; passing an object is valid).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0006_ai_pipeline.sql apps/web/src/app/api/ingest/route.ts
git commit -m "feat(ai): add pgmq_send enqueue RPC; wire ingest to it (0006 pt.1)"
```

---

### Task 2: Worker skeleton + drain loop + HMAC stub callback (the demoable spine)

Proves the full job lifecycle: ingest enqueues → worker reads pgmq → flips `processing` → POSTs a **stub** result → callback flips `done`. No LLM yet.

**Files:**
- Create: `services/ai/pyproject.toml`, `services/ai/.env.example`, `services/ai/app/{__init__.py,config.py,db.py,llm.py,callback.py,worker.py,main.py,schemas.py}`, `services/ai/app/pipeline/__init__.py`, `services/ai/tests/{conftest.py,test_callback_contract.py}`.
- Create: `apps/web/src/lib/supabase/service.ts`, `apps/web/src/app/api/ai/callback/route.ts`.
- Modify: `apps/web/src/lib/env.ts`, `.env.example`.

**Interfaces:**
- `config.Settings` (pydantic-settings) fields: `database_url`, `callback_url`, `callback_secret`, `openai_base_url`, `openai_api_key`, `extraction_model`, `summary_model`, `embedding_model`, `poll_interval_s=2.0`, `visibility_timeout_s=120`, `max_attempts=3`, `supabase_url`, `supabase_service_role_key`.
- `db.Database.connect()/close()`; `read_jobs(n) -> list[{msg_id,read_ct,record_id}]`; `delete_job(msg_id)`; `archive_job(msg_id)`; `set_status(record_id,status)`; `get_record(record_id) -> dict|None`.
- `callback.post_result(payload: dict) -> None` — signs the exact bytes with HMAC-SHA256, header `X-Signature: sha256=<hex>`.
- `schemas.CallbackPayload`: `record_id, status∈{done,needs_review,failed}, extracted:dict|None, lab_values:[LabValue], medications:[Medication], embeddings:[Embedding], summary:str|None, summary_hi:str|None`.
- Callback route consumes the same shape, zod-validated.

- [ ] **Step 1: Write `pyproject.toml`**

`services/ai/pyproject.toml`:

```toml
[project]
name = "sehatvault-ai"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "asyncpg>=0.30",
  "httpx>=0.27",
  "openai>=1.50",
  "pydantic>=2.9",
  "pydantic-settings>=2.5",
  "pillow>=10.4",
  "pdf2image>=1.17",
]

[project.optional-dependencies]
dev = ["pytest>=8.3", "pytest-asyncio>=0.24", "respx>=0.21"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 2: Write `config.py` and `.env.example`**

`services/ai/app/config.py`:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    callback_url: str = "http://localhost:3000/api/ai/callback"
    callback_secret: str = ""

    supabase_url: str = ""
    supabase_service_role_key: str = ""

    openai_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    openai_api_key: str = ""
    extraction_model: str = "gemini-2.5-flash"
    summary_model: str = "gemini-2.5-flash"
    embedding_model: str = "text-embedding-004"

    poll_interval_s: float = 2.0
    visibility_timeout_s: int = 120
    max_attempts: int = 3


settings = Settings()
```

`services/ai/.env.example`:

```
# SehatVault AI worker — NAMES ONLY. Real values in .env (gitignored). Key left BLANK.
DATABASE_URL=
CALLBACK_URL=http://localhost:3000/api/ai/callback
CALLBACK_SECRET=

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
OPENAI_API_KEY=
EXTRACTION_MODEL=gemini-2.5-flash
SUMMARY_MODEL=gemini-2.5-flash
EMBEDDING_MODEL=text-embedding-004
```

Also add `services/ai/.env` to `.gitignore` if not already covered.

- [ ] **Step 3: Write `schemas.py`**

`services/ai/app/schemas.py`:

```python
from typing import Literal, Optional
from pydantic import BaseModel, Field


class LabValue(BaseModel):
    analyte: str
    value: float
    unit: Optional[str] = None
    measured_at: Optional[str] = None  # ISO date
    ref_low: Optional[float] = None
    ref_high: Optional[float] = None
    flag: Optional[str] = None  # 'low' | 'high' | 'normal' | None


class Medication(BaseModel):
    name: str
    dose: Optional[str] = None
    frequency: Optional[str] = None
    active: bool = True
    started_at: Optional[str] = None


class Embedding(BaseModel):
    chunk: str
    vector: list[float]


class CallbackPayload(BaseModel):
    record_id: str
    status: Literal["done", "needs_review", "failed"]
    extracted: Optional[dict] = None
    lab_values: list[LabValue] = Field(default_factory=list)
    medications: list[Medication] = Field(default_factory=list)
    embeddings: list[Embedding] = Field(default_factory=list)
    summary: Optional[str] = None
    summary_hi: Optional[str] = None


class Extracted(BaseModel):
    type: str = "other"
    title: Optional[str] = None
    doc_date: Optional[str] = None
    facility: Optional[str] = None
    doctor: Optional[str] = None
    raw_values: list[dict] = Field(default_factory=list)
    confidence: float = 0.0
```

- [ ] **Step 4: Write `db.py`**

`services/ai/app/db.py`:

```python
import asyncpg
from .config import settings


class Database:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None

    async def connect(self) -> None:
        self._pool = await asyncpg.create_pool(settings.database_url, min_size=1, max_size=4)

    async def close(self) -> None:
        if self._pool:
            await self._pool.close()

    async def read_jobs(self, n: int) -> list[dict]:
        rows = await self._pool.fetch(
            "select msg_id, read_ct, message from pgmq.read($1, $2, $3)",
            "ai_jobs", settings.visibility_timeout_s, n,
        )
        return [
            {"msg_id": r["msg_id"], "read_ct": r["read_ct"], "record_id": r["message"]["record_id"]}
            for r in rows
        ]

    async def delete_job(self, msg_id: int) -> None:
        await self._pool.execute("select pgmq.delete($1, $2)", "ai_jobs", msg_id)

    async def archive_job(self, msg_id: int) -> None:
        await self._pool.execute("select pgmq.archive($1, $2)", "ai_jobs", msg_id)

    async def set_status(self, record_id: str, status: str) -> None:
        await self._pool.execute(
            "update public.health_record set ocr_status = $1::ocr_status where id = $2::uuid",
            status, record_id,
        )

    async def get_record(self, record_id: str) -> dict | None:
        row = await self._pool.fetchrow(
            "select id, family_id, member_id, file_object_key, page_count "
            "from public.health_record where id = $1::uuid",
            record_id,
        )
        return dict(row) if row else None


db = Database()
```

- [ ] **Step 5: Write `callback.py`**

`services/ai/app/callback.py`:

```python
import hashlib
import hmac
import json
import httpx
from .config import settings


def sign(body: bytes) -> str:
    digest = hmac.new(settings.callback_secret.encode(), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


async def post_result(payload: dict) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode()
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            settings.callback_url,
            content=body,
            headers={"Content-Type": "application/json", "X-Signature": sign(body)},
        )
        resp.raise_for_status()
```

- [ ] **Step 6: Write `llm.py` (provider wrapper — interface now, real calls used Task 3+)**

`services/ai/app/llm.py`:

```python
from openai import AsyncOpenAI
from .config import settings

_client = AsyncOpenAI(base_url=settings.openai_base_url, api_key=settings.openai_api_key or "x")


async def vision_json(prompt: str, image_data_uris: list[str], model: str | None = None) -> str:
    """Vision call returning raw model text (expected JSON). Caller parses/validates."""
    content: list[dict] = [{"type": "text", "text": prompt}]
    content += [{"type": "image_url", "image_url": {"url": uri}} for uri in image_data_uris]
    resp = await _client.chat.completions.create(
        model=model or settings.extraction_model,
        messages=[{"role": "user", "content": content}],
        temperature=0,
    )
    return resp.choices[0].message.content or ""


async def text(prompt: str, model: str | None = None) -> str:
    resp = await _client.chat.completions.create(
        model=model or settings.summary_model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return resp.choices[0].message.content or ""


async def embed(chunks: list[str]) -> list[list[float]]:
    resp = await _client.embeddings.create(model=settings.embedding_model, input=chunks)
    return [d.embedding for d in resp.data]
```

- [ ] **Step 7: Write `worker.py` with a STUB pipeline (replaced in Task 3)**

`services/ai/app/worker.py`:

```python
import logging
from .db import db
from .callback import post_result

log = logging.getLogger("worker")


async def process_job(record_id: str) -> None:
    """Task 2 stub: prove the lifecycle. Real stages wired in Task 3+."""
    await db.set_status(record_id, "processing")
    payload = {
        "record_id": record_id,
        "status": "done",
        "extracted": {"stub": True},
        "lab_values": [],
        "medications": [],
        "embeddings": [],
        "summary": None,
        "summary_hi": None,
    }
    await post_result(payload)
    log.info("processed record_id=%s (stub)", record_id)
```

`services/ai/app/__init__.py` and `services/ai/app/pipeline/__init__.py`: empty files.

- [ ] **Step 8: Write `main.py` with the drain loop**

`services/ai/app/main.py`:

```python
import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .config import settings
from .db import db
from .worker import process_job

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("main")


async def drain_loop() -> None:
    while True:
        try:
            jobs = await db.read_jobs(n=5)
            for job in jobs:
                try:
                    await process_job(job["record_id"])
                    await db.delete_job(job["msg_id"])
                except Exception:
                    log.exception("job failed msg_id=%s", job["msg_id"])
                    if job["read_ct"] >= settings.max_attempts:
                        await db.set_status(job["record_id"], "failed")
                        await db.archive_job(job["msg_id"])
            if not jobs:
                await asyncio.sleep(settings.poll_interval_s)
        except Exception:
            log.exception("drain loop error")
            await asyncio.sleep(settings.poll_interval_s)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.connect()
    task = asyncio.create_task(drain_loop())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task
    await db.close()


app = FastAPI(lifespan=lifespan)


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}
```

- [ ] **Step 9: Add server env to web `env.ts` + service-role client**

In `apps/web/src/lib/env.ts`, append (parsed lazily so client bundles never touch it):

```ts
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  AI_CALLBACK_SECRET: z.string().min(1),
});

export function serverEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    AI_CALLBACK_SECRET: process.env.AI_CALLBACK_SECRET,
  });
}
```

Create `apps/web/src/lib/supabase/service.ts`:

```ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";

// Service-role client: bypasses RLS. SERVER-ONLY. Never import into a client component.
export function createServiceClient() {
  return createSupabaseClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL ?? "",
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

- [ ] **Step 10: Write the callback route (HMAC verify + status flip; child-row writes land Task 4)**

Create `apps/web/src/app/api/ai/callback/route.ts`:

```ts
import { type NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

const PayloadSchema = z.object({
  record_id: z.string().uuid(),
  status: z.enum(["done", "needs_review", "failed"]),
  extracted: z.record(z.unknown()).nullable().optional(),
  lab_values: z.array(z.unknown()).default([]),
  medications: z.array(z.unknown()).default([]),
  embeddings: z.array(z.unknown()).default([]),
  summary: z.string().nullable().optional(),
  summary_hi: z.string().nullable().optional(),
});

function verify(raw: string, header: string | null, secret: string): boolean {
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const secret = serverEnv().AI_CALLBACK_SECRET;
  if (!verify(raw, req.headers.get("x-signature"), secret)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  let parsed;
  try {
    parsed = PayloadSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: { code: "BAD_REQUEST" } }, { status: 400 });
  }

  const svc = createServiceClient();
  // Task 2: status + summary fields only. Structured child-row inserts land in Task 4.
  const { error } = await svc
    .from("health_record")
    .update({
      ocr_status: parsed.status,
      extracted: parsed.extracted ?? null,
      summary: parsed.summary ?? null,
      summary_hi: parsed.summary_hi ?? null,
    })
    .eq("id", parsed.record_id);

  if (error) {
    return NextResponse.json({ error: { code: "INTERNAL_SERVER_ERROR" } }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 11: Update `.env.example` to the provider-agnostic AI var set**

In `.env.example`, replace the `--- AI: Claude (required at M2) ---` block with:

```
# --- AI worker callback (web side) ---
SUPABASE_SERVICE_ROLE_KEY=
AI_CALLBACK_SECRET=
# Worker-side AI provider vars live in services/ai/.env (see services/ai/.env.example).
```

- [ ] **Step 12: Worker-side contract test (HMAC sign round-trips, payload validates)**

`services/ai/tests/test_callback_contract.py`:

```python
import hashlib
import hmac
import json
from app.callback import sign
from app.config import settings
from app.schemas import CallbackPayload


def test_sign_matches_hmac_sha256(monkeypatch):
    monkeypatch.setattr(settings, "callback_secret", "test-secret")
    body = b'{"record_id":"x"}'
    expected = "sha256=" + hmac.new(b"test-secret", body, hashlib.sha256).hexdigest()
    assert sign(body) == expected


def test_payload_serialises_with_defaults():
    p = CallbackPayload(record_id="11111111-1111-1111-1111-111111111111", status="done")
    data = json.loads(p.model_dump_json())
    assert data["lab_values"] == [] and data["embeddings"] == []
```

`services/ai/tests/conftest.py`: empty (pytest `pythonpath=["."]` from pyproject makes `app` importable).

- [ ] **Step 13: Run worker tests**

Run: `cd services/ai && python -m pytest -q`
Expected: 2 passed.

- [ ] **Step 14: Typecheck web**

Run: `pnpm --filter web typecheck`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add services/ai apps/web/src/lib/env.ts apps/web/src/lib/supabase/service.ts apps/web/src/app/api/ai/callback/route.ts .env.example .gitignore
git commit -m "feat(ai): worker drain-loop skeleton + HMAC callback spine (stub result)"
```

---

### Task 3: Real reading — preprocess + extract + classify

Replace the Task 2 stub with real document reading. Output: extracted JSON folded onto `health_record.extracted`, `type` validated, `needs_review` on low confidence.

**Files:**
- Create: `services/ai/app/pipeline/preprocess.py`, `extract.py`, `classify.py`.
- Modify: `services/ai/app/worker.py` (replace stub).
- Test: `services/ai/tests/test_classify.py`.

**Interfaces:**
- `preprocess.load_images(record: dict) -> list[str]` — base64 `data:` URIs (≤5 pages, downscaled). Fetches the storage object via the service-role key against `{SUPABASE_URL}/storage/v1/object/documents/{key}`. PDF → images via `pdf2image`.
- `extract.run(images: list[str]) -> Extracted` (from `schemas.py`).
- `classify.to_record_type(raw_type: str | None) -> str` — maps free-text to `{'prescription','lab_report','scan','discharge','vaccination','bill','other'}`; unknown → `'other'`.

- [ ] **Step 1: Write `classify.py` (pure, testable first)**

`services/ai/app/pipeline/classify.py`:

```python
RECORD_TYPES = {"prescription", "lab_report", "scan", "discharge", "vaccination", "bill", "other"}

_ALIASES = {
    "prescription": "prescription", "rx": "prescription",
    "lab": "lab_report", "lab report": "lab_report", "labreport": "lab_report",
    "pathology": "lab_report", "blood test": "lab_report", "test report": "lab_report",
    "scan": "scan", "x-ray": "scan", "xray": "scan", "mri": "scan", "ct": "scan",
    "ultrasound": "scan", "radiology": "scan", "imaging": "scan",
    "discharge": "discharge", "discharge summary": "discharge",
    "vaccination": "vaccination", "vaccine": "vaccination", "immunization": "vaccination",
    "bill": "bill", "invoice": "bill", "receipt": "bill",
}


def to_record_type(raw_type: str | None) -> str:
    if not raw_type:
        return "other"
    key = raw_type.strip().lower()
    if key in RECORD_TYPES:
        return key
    return _ALIASES.get(key, "other")
```

- [ ] **Step 2: Write the failing classify test**

`services/ai/tests/test_classify.py`:

```python
import pytest
from app.pipeline.classify import to_record_type


@pytest.mark.parametrize("raw,expected", [
    ("Lab Report", "lab_report"),
    ("blood test", "lab_report"),
    ("X-Ray", "scan"),
    ("Rx", "prescription"),
    ("invoice", "bill"),
    ("immunization", "vaccination"),
    ("something weird", "other"),
    (None, "other"),
    ("", "other"),
])
def test_to_record_type(raw, expected):
    assert to_record_type(raw) == expected
```

- [ ] **Step 3: Run it**

Run: `cd services/ai && python -m pytest tests/test_classify.py -q`
Expected: 9 passed.

- [ ] **Step 4: Write `preprocess.py`**

`services/ai/app/pipeline/preprocess.py`:

```python
import base64
import io
import httpx
from pdf2image import convert_from_bytes
from PIL import Image
from ..config import settings

MAX_PAGES = 5
MAX_EDGE = 1600


def _to_data_uri(img: Image.Image) -> str:
    img.thumbnail((MAX_EDGE, MAX_EDGE))
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/jpeg;base64,{b64}"


async def _fetch_object(file_object_key: str) -> tuple[bytes, str]:
    url = f"{settings.supabase_url}/storage/v1/object/documents/{file_object_key}"
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            url, headers={"Authorization": f"Bearer {settings.supabase_service_role_key}"}
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("content-type", "")


async def load_images(record: dict) -> list[str]:
    key = record.get("file_object_key")
    if not key:
        return []  # pure manual record; nothing to read
    data, content_type = await _fetch_object(key)
    if "pdf" in content_type or key.lower().endswith(".pdf"):
        pages = convert_from_bytes(data, fmt="jpeg", dpi=150)[:MAX_PAGES]
        return [_to_data_uri(p) for p in pages]
    return [_to_data_uri(Image.open(io.BytesIO(data)))]
```

- [ ] **Step 5: Write `extract.py`**

`services/ai/app/pipeline/extract.py`:

```python
import json
from .. import llm
from ..schemas import Extracted

_PROMPT = """You are a medical-document extraction engine for India. Read the attached
document image(s) and return ONLY a JSON object, no prose, matching exactly this shape:
{"type": one of ["prescription","lab_report","scan","discharge","vaccination","bill","other"],
 "title": short human title or null,
 "doc_date": ISO date YYYY-MM-DD or null,
 "facility": clinic/lab/hospital name or null,
 "doctor": doctor name or null,
 "raw_values": [ {"name": analyte as printed, "value": string, "unit": string or null,
                  "ref_range": string or null} ],
 "confidence": 0.0 to 1.0 overall extraction confidence}
Extract every lab analyte you can read into raw_values. If the document is not medical,
use type "other" and confidence below 0.4."""


async def run(images: list[str]) -> Extracted:
    if not images:
        return Extracted(type="other", confidence=0.0)
    raw = await llm.vision_json(_PROMPT, images)
    text = raw.strip()
    if text.startswith("```"):
        text = text.strip("`")
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return Extracted(type="other", confidence=0.0)
    try:
        data = json.loads(text[start:end + 1])
    except (ValueError, json.JSONDecodeError):
        return Extracted(type="other", confidence=0.0)
    return Extracted(**{k: v for k, v in data.items() if k in Extracted.model_fields})
```

- [ ] **Step 6: Rewrite `worker.py` to run the real stages**

`services/ai/app/worker.py`:

```python
import logging
from .db import db
from .callback import post_result
from .pipeline import preprocess, extract, classify

log = logging.getLogger("worker")
CONFIDENCE_FLOOR = 0.4


async def process_job(record_id: str) -> None:
    await db.set_status(record_id, "processing")
    record = await db.get_record(record_id)
    if record is None:
        log.warning("record gone record_id=%s", record_id)
        return

    images = await preprocess.load_images(record)
    extracted = await extract.run(images)
    extracted.type = classify.to_record_type(extracted.type)

    status = "needs_review" if extracted.confidence < CONFIDENCE_FLOOR else "done"
    payload = {
        "record_id": record_id,
        "status": status,
        "extracted": extracted.model_dump(),
        "lab_values": [],      # Task 5
        "medications": [],     # Task 5
        "embeddings": [],      # Task 6
        "summary": None,       # Task 7
        "summary_hi": None,
    }
    await post_result(payload)
    log.info("processed record_id=%s status=%s pages=%d", record_id, status, len(images))
```

- [ ] **Step 7: Run worker tests**

Run: `cd services/ai && python -m pytest -q`
Expected: classify(9) + callback(2) green. (Live LLM smoke is manual once a key is in `services/ai/.env`; the unit suite must pass with the key blank.)

- [ ] **Step 8: Commit**

```bash
git add services/ai
git commit -m "feat(ai): preprocess + vision extract + classify (real reading)"
```

---

### Task 4: Migration `0006` tables + RLS + isolation tests + callback persistence

Add the three structured tables, wire the callback to insert their rows, and prove RLS isolation. **This is the PHI-table-RLS gate task.**

**Files:**
- Modify (append): `supabase/migrations/0006_ai_pipeline.sql` (tables + RLS + Realtime publication).
- Modify: `supabase/tests/rls_isolation.test.sql` (isolation blocks for each new table).
- Modify: `apps/web/src/app/api/ai/callback/route.ts` (insert `lab_value`/`medication` rows).
- Modify: `docs/database/Schema.md` (author the new tables).

**Interfaces:**
- Tables `lab_value`, `record_embedding`, `medication` per the columns below. Each: `family_id` denormalised, 4 RLS policies via `auth_family_ids()`, FK to `health_record(id)`, denorm-integrity trigger, `set_updated_at` where `updated_at` exists.
- Callback consumes `LabValue`/`Medication` shapes from `schemas.py`. `record_embedding` inserts deferred to Task 6.

- [ ] **Step 1: Append the three tables + RLS + Realtime to `0006_ai_pipeline.sql`**

```sql
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
```

- [ ] **Step 2: Add isolation blocks for the new tables**

In `supabase/tests/rls_isolation.test.sql`, as owner A (after A's `health_record` exists), seed one row in each new table; in the family-B role section assert `count = 0` reads; and in the post-attack "intact" section assert A's rows survive. Add — in the owner-A seeding area:

```sql
-- lab_value / medication seed for A (record_embedding left empty; covered by read-deny)
do $$
declare rec_a uuid; mem_a uuid; fam_a uuid := current_setting('test.family_a')::uuid;
begin
  select id, member_id into rec_a, mem_a from health_record where family_id = fam_a limit 1;
  insert into lab_value (family_id, record_id, member_id, analyte, value, unit, measured_at)
    values (fam_a, rec_a, mem_a, 'hba1c', 7.2, '%', '2026-06-01');
  insert into medication (family_id, member_id, record_id, name, dose, frequency)
    values (fam_a, mem_a, rec_a, 'Metformin', '500mg', 'BD');
end$$;
```

In the family-B role section:

```sql
do $$
declare n int;
begin
  select count(*) into n from lab_value;        perform public.assert_rls(n = 0, 'B cannot read A lab_value');
  select count(*) into n from medication;       perform public.assert_rls(n = 0, 'B cannot read A medication');
  select count(*) into n from record_embedding; perform public.assert_rls(n = 0, 'B cannot read A record_embedding');
end$$;
```

In the post-attack "intact" block (role reset to A):

```sql
do $$
declare n int; fam_a uuid := current_setting('test.family_a')::uuid;
begin
  select count(*) into n from lab_value  where family_id = fam_a and analyte = 'hba1c';
  perform public.assert_rls(n = 1, 'A''s lab_value must be intact after B''s attacks');
  select count(*) into n from medication where family_id = fam_a and name = 'Metformin';
  perform public.assert_rls(n = 1, 'A''s medication must be intact after B''s attacks');
end$$;
```

Also add the new tables to the "no identity ⇒ 0 rows" block and update the trailing `\echo` lines.

- [ ] **Step 3: Run the RLS isolation suite**

Run: `supabase/tests/run-rls-tests.sh`
Expected: all assertions pass, including the new table checks.

- [ ] **Step 4: Persist structured rows in the callback (idempotent)**

In `apps/web/src/app/api/ai/callback/route.ts`, replace the `lab_values`/`medications` array schemas with typed objects and, after the `health_record` update, insert child rows idempotently (delete-then-insert keyed on `record_id`):

```ts
const LabValueSchema = z.object({
  analyte: z.string(), value: z.number(), unit: z.string().nullable().optional(),
  measured_at: z.string().nullable().optional(), ref_low: z.number().nullable().optional(),
  ref_high: z.number().nullable().optional(), flag: z.string().nullable().optional(),
});
const MedicationSchema = z.object({
  name: z.string(), dose: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(), active: z.boolean().default(true),
  started_at: z.string().nullable().optional(),
});
// in PayloadSchema replace the two lines:
//   lab_values: z.array(LabValueSchema).default([]),
//   medications: z.array(MedicationSchema).default([]),
```

After the `health_record` update succeeds:

```ts
const { data: rec } = await svc
  .from("health_record").select("family_id, member_id").eq("id", parsed.record_id).single();
if (rec) {
  await svc.from("lab_value").delete().eq("record_id", parsed.record_id);
  if (parsed.lab_values.length) {
    await svc.from("lab_value").insert(parsed.lab_values.map((v) => ({
      ...v, record_id: parsed.record_id, family_id: rec.family_id, member_id: rec.member_id,
    })));
  }
  await svc.from("medication").delete().eq("record_id", parsed.record_id);
  if (parsed.medications.length) {
    await svc.from("medication").insert(parsed.medications.map((m) => ({
      ...m, record_id: parsed.record_id, family_id: rec.family_id, member_id: rec.member_id,
    })));
  }
}
```

- [ ] **Step 5: Typecheck + RLS suite**

Run: `pnpm --filter web typecheck` → PASS.
Run: `supabase/tests/run-rls-tests.sh` → PASS.
(Prod apply happens at merge time per `docs/ops/DB-Migrations.md`; do not apply to remote from this task.)

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0006_ai_pipeline.sql supabase/tests/rls_isolation.test.sql apps/web/src/app/api/ai/callback/route.ts docs/database/Schema.md
git commit -m "feat(ai): 0006 lab_value/medication/record_embedding + RLS + callback persistence"
```

---

### Task 5: normalise → lab_value, + member trend chart

Turn raw extracted values into canonical analytes/units, and render a trend chart on the member page. Shared analyte canon lives in `packages/core` so the chart and worker agree.

**Files:**
- Create: `packages/core/src/lab.ts`, `packages/core/src/lab.test.ts`.
- Create: `services/ai/app/pipeline/normalise.py`, `services/ai/tests/test_normalise.py`.
- Modify: `services/ai/app/worker.py` (call normalise; populate `lab_values`).
- Create: `apps/web/src/app/(app)/members/[id]/trends/page.tsx` + a `TrendChart` client component.
- Modify: `packages/core/src/index.ts`, `packages/i18n/src/en.json` + `hi.json` (`trends.*`).

**Interfaces:**
- `packages/core` exports `ANALYTES: Record<string, { label; unit; refLow?; refHigh?; aliases }>` and `canonicalAnalyte(raw: string): string | null`.
- `normalise.normalise_values(raw_values: list[dict], doc_date: str | None) -> list[LabValue]`.

- [ ] **Step 1: Write the analyte canon test in core (TDD)**

`packages/core/src/lab.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { canonicalAnalyte, ANALYTES } from "./lab";

describe("canonicalAnalyte", () => {
  it("maps known aliases", () => {
    expect(canonicalAnalyte("HbA1c")).toBe("hba1c");
    expect(canonicalAnalyte("Glycated Haemoglobin")).toBe("hba1c");
    expect(canonicalAnalyte("Fasting Blood Sugar")).toBe("fasting_glucose");
    expect(canonicalAnalyte("TSH")).toBe("tsh");
    expect(canonicalAnalyte("Haemoglobin")).toBe("hemoglobin");
    expect(canonicalAnalyte("Creatinine")).toBe("creatinine");
  });
  it("returns null for unknown", () => {
    expect(canonicalAnalyte("zzz")).toBeNull();
  });
  it("every analyte has a unit + label", () => {
    for (const a of Object.values(ANALYTES)) {
      expect(a.label.length).toBeGreaterThan(0);
      expect(a.unit.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `pnpm --filter @sehatvault/core test -- lab`
Expected: FAIL (cannot find `./lab`).

- [ ] **Step 3: Implement `packages/core/src/lab.ts`**

```ts
export interface AnalyteDef {
  label: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  aliases: string[];
}

export const ANALYTES: Record<string, AnalyteDef> = {
  hba1c: { label: "HbA1c", unit: "%", refLow: 4, refHigh: 5.6,
    aliases: ["hba1c", "glycated haemoglobin", "glycated hemoglobin", "a1c"] },
  fasting_glucose: { label: "Fasting Glucose", unit: "mg/dL", refLow: 70, refHigh: 100,
    aliases: ["fasting glucose", "fasting blood sugar", "fbs", "glucose fasting"] },
  tsh: { label: "TSH", unit: "µIU/mL", refLow: 0.4, refHigh: 4.0,
    aliases: ["tsh", "thyroid stimulating hormone"] },
  hemoglobin: { label: "Hemoglobin", unit: "g/dL", refLow: 12, refHigh: 17,
    aliases: ["hemoglobin", "haemoglobin", "hb", "hgb"] },
  creatinine: { label: "Creatinine", unit: "mg/dL", refLow: 0.6, refHigh: 1.3,
    aliases: ["creatinine", "serum creatinine"] },
  systolic_bp: { label: "Systolic BP", unit: "mmHg", refLow: 90, refHigh: 120,
    aliases: ["systolic", "systolic bp", "sbp"] },
  diastolic_bp: { label: "Diastolic BP", unit: "mmHg", refLow: 60, refHigh: 80,
    aliases: ["diastolic", "diastolic bp", "dbp"] },
};

const ALIAS_INDEX: Record<string, string> = Object.fromEntries(
  Object.entries(ANALYTES).flatMap(([k, def]) => def.aliases.map((a) => [a, k])),
);

export function canonicalAnalyte(raw: string): string | null {
  return ALIAS_INDEX[raw.trim().toLowerCase()] ?? null;
}
```

Add `export * from "./lab";` to `packages/core/src/index.ts`.

- [ ] **Step 4: Run core tests**

Run: `pnpm --filter @sehatvault/core test`
Expected: existing 19 + new lab tests all pass.

- [ ] **Step 5: Write `normalise.py` test (TDD)**

`services/ai/tests/test_normalise.py`:

```python
from app.pipeline.normalise import normalise_values


def test_maps_known_analyte_and_flags_high():
    out = normalise_values(
        [{"name": "HbA1c", "value": "7.2", "unit": "%", "ref_range": "4-5.6"}],
        "2026-06-01",
    )
    assert len(out) == 1
    lv = out[0]
    assert lv.analyte == "hba1c" and lv.value == 7.2 and lv.flag == "high"
    assert lv.measured_at == "2026-06-01"


def test_drops_unrecognised():
    assert normalise_values([{"name": "zzz", "value": "1"}], None) == []


def test_skips_nonnumeric_value():
    assert normalise_values([{"name": "TSH", "value": "n/a"}], None) == []
```

- [ ] **Step 6: Run it (fails)**

Run: `cd services/ai && python -m pytest tests/test_normalise.py -q`
Expected: FAIL (module missing).

- [ ] **Step 7: Implement `normalise.py`**

```python
import re
from ..schemas import LabValue

# Mirror of packages/core/src/lab.ts ANALYTES. Keep in sync (both are small, change rarely).
ANALYTES = {
    "hba1c": (["hba1c", "glycated haemoglobin", "glycated hemoglobin", "a1c"], "%", 4.0, 5.6),
    "fasting_glucose": (["fasting glucose", "fasting blood sugar", "fbs", "glucose fasting"], "mg/dL", 70.0, 100.0),
    "tsh": (["tsh", "thyroid stimulating hormone"], "µIU/mL", 0.4, 4.0),
    "hemoglobin": (["hemoglobin", "haemoglobin", "hb", "hgb"], "g/dL", 12.0, 17.0),
    "creatinine": (["creatinine", "serum creatinine"], "mg/dL", 0.6, 1.3),
    "systolic_bp": (["systolic", "systolic bp", "sbp"], "mmHg", 90.0, 120.0),
    "diastolic_bp": (["diastolic", "diastolic bp", "dbp"], "mmHg", 60.0, 80.0),
}
_ALIAS = {a: k for k, (aliases, *_rest) in ANALYTES.items() for a in aliases}


def _canonical(raw: str) -> str | None:
    return _ALIAS.get(raw.strip().lower())


def _num(raw) -> float | None:
    if raw is None:
        return None
    m = re.search(r"-?\d+(\.\d+)?", str(raw))
    return float(m.group()) if m else None


def normalise_values(raw_values: list[dict], doc_date: str | None) -> list[LabValue]:
    out: list[LabValue] = []
    for rv in raw_values:
        analyte = _canonical(str(rv.get("name", "")))
        value = _num(rv.get("value"))
        if analyte is None or value is None:
            continue
        _aliases, unit, ref_low, ref_high = ANALYTES[analyte]
        if value < ref_low:
            flag = "low"
        elif value > ref_high:
            flag = "high"
        else:
            flag = "normal"
        out.append(LabValue(
            analyte=analyte, value=value, unit=rv.get("unit") or unit,
            measured_at=doc_date, ref_low=ref_low, ref_high=ref_high, flag=flag,
        ))
    return out
```

- [ ] **Step 8: Run normalise tests**

Run: `cd services/ai && python -m pytest tests/test_normalise.py -q`
Expected: 3 passed.

- [ ] **Step 9: Wire normalise into the worker**

In `services/ai/app/worker.py`, import `normalise` and after `extract.run`/classify:

```python
from .pipeline import preprocess, extract, classify, normalise
...
    lab_values = normalise.normalise_values(extracted.raw_values, extracted.doc_date)
    ...
    payload["lab_values"] = [lv.model_dump() for lv in lab_values]
```

(Medications: only populate if the extract prompt returned a recognisable medication list; for the demo, leaving `medications` empty when none are confidently parsed is correct — do not invent meds.)

- [ ] **Step 10: Build the trend chart page**

Create `apps/web/src/app/(app)/members/[id]/trends/page.tsx` (RSC: RLS-scoped fetch of `lab_value` for the member via the cookie/anon client, grouped by analyte, ordered by `measured_at`) + a `"use client"` `TrendChart`. First check `apps/web/package.json` for `recharts`; if present use it, else render an accessible SVG line per analyte. Use `ANALYTES[analyte].label`/`.unit` from `@sehatvault/core`; Calm Indigo tokens + `@sehatvault/ui` `Card`/`Section`; ref-range band; status via Lucide `TrendingUp`/`TrendingDown`/`Minus` (icon+label, never colour alone); `EmptyState` when no values; copy via `t()`. Responsive 375/768/1024/1440; reduced-motion safe.

- [ ] **Step 11: Add i18n keys**

Add `trends.title`, `trends.empty`, `trends.no_member`, `trends.ref_range`, `trends.flag.high/low/normal` to `en.json` + `hi.json`.

- [ ] **Step 12: Typecheck + tests + pixel verify**

Run: `pnpm --filter @sehatvault/core test && pnpm --filter web typecheck && cd services/ai && python -m pytest -q`
Expected: all green.
Pixel: drive agent-browser to `/members/<id>/trends` (1440 + 375), screenshot, confirm chart + empty state render with no horizontal scroll.

- [ ] **Step 13: Commit**

```bash
git add packages/core services/ai "apps/web/src/app/(app)/members" packages/i18n
git commit -m "feat(ai): normalise raw values → lab_value + member trend chart"
```

---

### Task 6: embed → record_embedding

Generate embeddings for each processed record and persist them (UI deferred per ADR-011).

**Files:**
- Create: `services/ai/app/pipeline/embed.py`.
- Modify: `services/ai/app/worker.py` (call embed; populate `embeddings`).
- Modify: `apps/web/src/app/api/ai/callback/route.ts` (insert `record_embedding` rows).

**Interfaces:**
- `embed.build_chunks(extracted: Extracted, lab_values: list[LabValue]) -> list[str]`.
- `embed.run(chunks: list[str]) -> list[Embedding]` — drops any vector whose length ≠ 768; returns `[]` on failure (Should, not spine).

- [ ] **Step 1: Write `embed.py`**

```python
from .. import llm
from ..schemas import Embedding, Extracted, LabValue

EMBED_DIM = 768


def build_chunks(extracted: Extracted, lab_values: list[LabValue]) -> list[str]:
    parts = [extracted.title or "", extracted.facility or "", extracted.doctor or ""]
    parts += [f"{lv.analyte} {lv.value}{lv.unit or ''}" for lv in lab_values]
    text = " | ".join(p for p in parts if p).strip()
    return [text] if text else []


async def run(chunks: list[str]) -> list[Embedding]:
    if not chunks:
        return []
    try:
        vectors = await llm.embed(chunks)
    except Exception:
        return []  # embeddings are Should; never fail the record over them
    return [Embedding(chunk=c, vector=v) for c, v in zip(chunks, vectors) if len(v) == EMBED_DIM]
```

- [ ] **Step 2: Wire into worker**

In `worker.py` after normalise:

```python
from .pipeline import preprocess, extract, classify, normalise, embed
...
    chunks = embed.build_chunks(extracted, lab_values)
    embeddings = await embed.run(chunks)
    payload["embeddings"] = [e.model_dump() for e in embeddings]
```

- [ ] **Step 3: Persist embeddings in the callback**

In `route.ts`, add the embedding schema + insert in the child-row block:

```ts
const EmbeddingSchema = z.object({ chunk: z.string(), vector: z.array(z.number()) });
// PayloadSchema: embeddings: z.array(EmbeddingSchema).default([]),
...
if (rec) {
  await svc.from("record_embedding").delete().eq("record_id", parsed.record_id);
  if (parsed.embeddings.length) {
    await svc.from("record_embedding").insert(parsed.embeddings.map((e) => ({
      record_id: parsed.record_id, family_id: rec.family_id, member_id: rec.member_id,
      chunk: e.chunk, embedding: `[${e.vector.join(",")}]`,
    })));
  }
}
```

- [ ] **Step 4: Tests + typecheck**

Run: `cd services/ai && python -m pytest -q && pnpm --filter web typecheck`
Expected: green (existing tests unaffected; embed is I/O-bound, covered by live smoke + the 768 guard).

- [ ] **Step 5: Commit**

```bash
git add services/ai apps/web/src/app/api/ai/callback/route.ts
git commit -m "feat(ai): embed records → record_embedding (pgvector, 768-dim guarded)"
```

---

### Task 7: summarise → summary + summary_hi

Generate a one-line plain-language summary in English + Hindi with a mandatory disclaimer.

**Files:**
- Create: `services/ai/app/pipeline/summarise.py`.
- Modify: `services/ai/app/worker.py` (call summarise; populate `summary`/`summary_hi`).
- Test: `services/ai/tests/test_summarise.py`.

**Interfaces:**
- `summarise.append_disclaimer(text: str, lang: str) -> str` — pure; idempotent.
- `summarise.run(extracted: Extracted, lab_values: list[LabValue]) -> tuple[str | None, str | None]`.

- [ ] **Step 1: Write the disclaimer test (TDD)**

`services/ai/tests/test_summarise.py`:

```python
from app.pipeline.summarise import append_disclaimer, DISCLAIMER_EN, DISCLAIMER_HI


def test_appends_en_disclaimer_once():
    out = append_disclaimer("HbA1c is 7.2%, slightly high.", "en")
    assert out.endswith(DISCLAIMER_EN)
    assert append_disclaimer(out, "en").count(DISCLAIMER_EN.strip()) == 1


def test_appends_hi_disclaimer():
    out = append_disclaimer("एचबीए1सी 7.2% है।", "hi")
    assert out.endswith(DISCLAIMER_HI)
```

- [ ] **Step 2: Run it (fails)**

Run: `cd services/ai && python -m pytest tests/test_summarise.py -q`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `summarise.py`**

```python
from .. import llm
from ..schemas import Extracted, LabValue

DISCLAIMER_EN = " This is not medical advice; consult a doctor."
DISCLAIMER_HI = " यह चिकित्सकीय सलाह नहीं है; डॉक्टर से सलाह लें।"

_PROMPT = """In one short plain sentence ({lang}), summarise this medical record for a
non-expert family caregiver. Do not give advice. Record type: {type}. Title: {title}.
Key values: {values}. Reply with only the sentence."""


def append_disclaimer(text: str, lang: str) -> str:
    d = DISCLAIMER_HI if lang == "hi" else DISCLAIMER_EN
    return text if text.rstrip().endswith(d.strip()) else text.rstrip() + d


async def _one(extracted: Extracted, values: str, lang: str) -> str | None:
    prompt = _PROMPT.format(lang="English" if lang == "en" else "Hindi",
                            type=extracted.type, title=extracted.title or "—", values=values or "—")
    try:
        text = (await llm.text(prompt)).strip()
    except Exception:
        return None
    return append_disclaimer(text, lang) if text else None


async def run(extracted: Extracted, lab_values: list[LabValue]) -> tuple[str | None, str | None]:
    values = ", ".join(f"{lv.analyte} {lv.value}{lv.unit or ''} ({lv.flag})" for lv in lab_values)
    return await _one(extracted, values, "en"), await _one(extracted, values, "hi")
```

- [ ] **Step 4: Run summarise tests**

Run: `cd services/ai && python -m pytest tests/test_summarise.py -q`
Expected: 2 passed.

- [ ] **Step 5: Wire into worker (final stage)**

In `worker.py` after embed:

```python
from .pipeline import preprocess, extract, classify, normalise, embed, summarise
...
    summary_en, summary_hi = await summarise.run(extracted, lab_values)
    payload["summary"] = summary_en
    payload["summary_hi"] = summary_hi
```

- [ ] **Step 6: Full worker suite**

Run: `cd services/ai && python -m pytest -q`
Expected: classify(9) + callback(2) + normalise(3) + summarise(2) all pass.

- [ ] **Step 7: Commit**

```bash
git add services/ai
git commit -m "feat(ai): plain-language summary (en+hi) with mandatory disclaimer"
```

---

### Task 8: Realtime UI states (ProcessingCard / ReviewCard / error)

Wire the record detail + timeline to show live status. Visible payoff of the pipeline; must pass the Design-System §9 checklist.

**Files:**
- Create: `apps/web/src/components/records/processing-card.tsx`.
- Create: `apps/web/src/components/records/use-record-realtime.ts`.
- Modify: `apps/web/src/app/(app)/records/[id]/_record-client.tsx`.
- Modify: `packages/i18n/src/en.json` + `hi.json` (`records.processing.*`, `records.review.*`).

**Interfaces:**
- `useRecordRealtime(recordId: string, initial: RecordRow): RecordRow` — subscribes to `health_record` row changes via Supabase Realtime (`postgres_changes`, `event: "UPDATE"`, `filter: id=eq.<recordId>`); falls back to a 4 s poll if the channel errors; returns the latest row.
- `ProcessingCard({ status }: { status: OcrStatus })` — renders pending/processing (Lucide `Loader2`, reduced-motion safe), `needs_review` (`AlertTriangle` + label), `failed` (`XCircle` + retry hint). Status by **icon + label**, never colour alone.

> Note: the Realtime publication for `health_record` was already added in Task 4 Step 1 §8. No migration change here.

- [ ] **Step 1: Write the realtime hook**

`apps/web/src/components/records/use-record-realtime.ts` — `"use client"`; browser client from `@/lib/supabase/client`; `supabase.channel("record-"+id).on("postgres_changes", { event: "UPDATE", schema: "public", table: "health_record", filter: \`id=eq.${id}\` }, (p) => setRow(p.new as RecordRow)).subscribe((status) => { if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") startPoll(); })`. Poll = `setInterval(async () => { const { data } = await supabase.from("health_record").select("*").eq("id", id).single(); if (data) setRow(data); }, 4000)`, cleared on unmount + on first successful subscribe. Returns `row`.

- [ ] **Step 2: Write `ProcessingCard`**

`apps/web/src/components/records/processing-card.tsx` — `"use client"`; `@sehatvault/ui` `Card`; switch on `status`; Lucide icons; all copy via `t()` using the `records.processing.*` keys; `Loader2` gets `motion-safe:animate-spin` only.

- [ ] **Step 3: Wire into `_record-client.tsx`**

`const row = useRecordRealtime(id, initial)`; if `row.ocr_status ∈ {pending,processing}` render `ProcessingCard`; if `done`/`needs_review` render the existing detail + extracted fields + `summary`/lab values + (needs_review banner); if `failed` render the error card with a re-extract action (reuse the existing `ReExtractButton`).

- [ ] **Step 4: Add i18n keys**

`records.processing.pending/processing/needs_review/failed`, `records.review.summary_label`, `records.review.disclaimer_note` → en + hi.

- [ ] **Step 5: Typecheck + pixel-verify the live flow**

Run: `pnpm --filter web typecheck` → PASS.
Pixel: with the worker running + a Gemini key, upload a synthetic lab report via the UI and watch the card go pending → processing → done live (agent-browser, 1440 + 375). Screenshot each state. Confirm no colour-only status, no horizontal scroll, reduced-motion respected.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/records "apps/web/src/app/(app)/records" packages/i18n
git commit -m "feat(ai): realtime record states — processing/review/error cards"
```

---

### Task 9: T1 eval set + accuracy pass

Build the golden-set harness so extraction accuracy is measurable (Dev Rule 5). For the demo it is the safety-net, not a launch gate.

**Files:**
- Create: `services/ai/eval/docs/` (≥10 synthetic de-identified reports to start; grow toward ~50), `services/ai/eval/golden.jsonl`, `services/ai/eval/run_eval.py`, `services/ai/eval/__init__.py`, `services/ai/tests/test_eval_scoring.py`.

**Interfaces:**
- `run_eval.score(predicted: list[LabValue], expected: list[dict]) -> dict` — `{matched, total, field_accuracy}` matching analyte + value within tolerance.

- [ ] **Step 1: Create synthetic eval docs + golden file**

Author ≥10 de-identified synthetic lab reports (no real PHI) under `services/ai/eval/docs/`. For each, add a `golden.jsonl` line: `{"file": "lab01.pdf", "lab_values": [{"analyte": "hba1c", "value": 7.2}, ...]}`.

- [ ] **Step 2: Write the scoring unit test (TDD, pure)**

`services/ai/tests/test_eval_scoring.py`:

```python
from app.schemas import LabValue
from eval.run_eval import score


def test_scoring_counts_matches_within_tolerance():
    pred = [LabValue(analyte="hba1c", value=7.2), LabValue(analyte="tsh", value=3.0)]
    exp = [{"analyte": "hba1c", "value": 7.25}, {"analyte": "tsh", "value": 9.9}]
    r = score(pred, exp)
    assert r["matched"] == 1 and r["total"] == 2
```

- [ ] **Step 3: Implement `run_eval.py`**

`score()` matches on `analyte` and `abs(pred.value - exp.value) <= max(0.1, 0.02*exp.value)`; aggregates `field_accuracy = matched/total`. `main()` iterates `golden.jsonl`, runs `preprocess.load_images` + `extract.run` + `normalise.normalise_values` per doc, prints a per-doc + aggregate table, exits non-zero if accuracy < 0.9 (informational; run manually once a key is pasted, not in CI without a key). Add `services/ai/eval/__init__.py` (empty) so `eval.run_eval` imports under pytest `pythonpath="."`.

- [ ] **Step 4: Run the scoring unit test**

Run: `cd services/ai && python -m pytest tests/test_eval_scoring.py -q`
Expected: 1 passed. (Full `run_eval.main()` is run manually once a key is present.)

- [ ] **Step 5: Commit**

```bash
git add services/ai/eval services/ai/tests/test_eval_scoring.py
git commit -m "test(ai): T1 extraction eval harness + scoring (synthetic golden set)"
```

---

### Task 10: Docs + status sync

**Files:**
- Modify: `CLAUDE.md`, `docs/progress.md`, `docs/Decisions.md` (note default-provider Gemini if not already an ADR), `docs/api/API-Spec.md` (`/api/ai/callback`), `.env.example` (final check), `docs/pr-history/` (new retrospective).

- [ ] **Step 1: Update `docs/progress.md`** — mark Sprint 7 stages done; set the next RESUME pointer.
- [ ] **Step 2: Update `CLAUDE.md`** — "What exists" gains the AI pipeline; status-line date.
- [ ] **Step 3: Document `POST /api/ai/callback`** in `docs/api/API-Spec.md` (HMAC header, payload, idempotency).
- [ ] **Step 4: Write `docs/pr-history/<n>-sprint7-ai-pipeline.md`** retrospective.
- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs
git commit -m "docs: Sprint 7 AI pipeline — status, API spec, retrospective"
```

---

## Self-Review

**Spec coverage:**
- §2 provider integration → Task 2 (`llm.py`, `config.py`, env). ✓
- §3 worker drain loop → Task 2 (`main.py`, `db.py`). ✓
- §4 six stages → preprocess/extract/classify (T3), normalise (T5), embed (T6), summarise (T7). ✓
- §5 migration 0006 + 3 tables + RLS → Task 1 (pgvector+RPC) + Task 4 (tables+RLS+isolation+Realtime). ✓
- §6 callback contract (HMAC, zod, idempotent, service-role) → Task 2 (HMAC+status) + Task 4 (child rows, idempotent) + Task 6 (embeddings). ✓
- §7 Realtime UI → Task 8. ✓
- §8 testing: T1 eval (T9), RLS isolation (T4), callback contract (T2), normalise units (T5). ✓
- §9 secrets names-only, key blank → Task 2 (`.env.example` web + worker). ✓
- §10 build order → Tasks 1–10 follow it (Task 1 splits out the enqueue fix the spec assumed already worked). ✓
- §11 out of scope (RAG UI, refill, Render deploy, T5) → not in any task. ✓

**Placeholder scan:** No `TBD`/`TODO` left as deliverables. Two UI units (trend chart T5-S10, realtime hook T8-S1/S2) are specified by exact file, props, tokens, icons, states, and the concrete `supabase.channel(...)` call rather than full JSX — because the chart lib choice depends on a `package.json` check and the JSX follows the existing `_record-client.tsx` pattern. Every code step elsewhere shows complete code.

**Type consistency:** `CallbackPayload`/`LabValue`/`Medication`/`Embedding` (schemas.py) match the zod schemas in `route.ts` field-for-field. `to_record_type` returns enum literals matching the `record_type` enum in 0004. `record_embedding.embedding vector(768)` matches `EMBED_DIM = 768` in `embed.run`. `canonicalAnalyte` (TS) and `_canonical` (Py) share the same analyte keys/aliases. `pgmq_send(p_queue_name, p_message)` signature matches the ingest call in Task 1 Step 2.

**Gap noted & handled:** the spec assumed enqueue worked; it didn't (`pgmq_send` was referenced by ingest but never defined). Task 1 closes that gap before the consumer exists — without it the pipeline would never receive a job.
