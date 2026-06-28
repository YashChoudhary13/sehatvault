# PR3 — Sprint 7: M2 AI Pipeline

| | |
|---|---|
| **Branch** | `feat/m2-ai-pipeline` |
| **Milestone** | M2 — AI Auto-Organise (Sprint 7 of Sprints 7–10) |
| **Commits** | 10 commits (`fb716dc` → `6e6519f`) |
| **Date completed** | 2026-06-28 |
| **Status** | ✅ Code-complete; pending live pixel-verification + prod migration `0006` + merge to `main` |

---

## What Was Implemented

### Migration `0006_ai_pipeline.sql`

- **pgvector guard** — enables the extension if not already present.
- **`pgmq_send` RPC** — a `SECURITY DEFINER` PostgreSQL function (`pgmq_send(p_queue_name text, p_message jsonb)`) that the `POST /api/ingest` route calls from the browser-facing anon client. This was a gap: the ingest route referenced an enqueue function that did not exist; Task 1 closes it before the consumer exists.
- **Three new PHI tables**, each with `family_id` denormalisation, a `check_phi_family()` trigger, and 4 RLS policies via `auth_family_ids()`:
  - `lab_value` — analyte, value, unit, ref_low/ref_high, flag, measured_at; indexed on `(member_id, analyte, measured_at)` for trend queries.
  - `record_embedding` — `embedding vector(768)`; one row per text chunk; indexed with `ivfflat` for cosine similarity (Q&A RAG, Should-have).
  - `medication` — name, dose, frequency, active, started_at; tied to a `record_id`.
- **`health_record` Realtime publication** — adds the table to `supabase_realtime` so the web client can subscribe to `ocr_status` transitions without polling.
- RLS isolation tests extended in `supabase/tests/rls_isolation.test.sql` for all three new tables. CI-verified (no local psql available).

### Python AI Worker (`services/ai/`)

**Architecture:** stateless FastAPI service; a background asyncio loop drains the `ai_jobs` pgmq queue. Each message carries a `health_record.id`. The worker flips `ocr_status` `pending → processing`, runs six pipeline stages in order, POSTs the HMAC-signed result to the web app callback, then calls `pgmq.delete` / `pgmq.archive`.

**Provider isolation (`app/llm.py`):** the worker uses the `openai` Python SDK against `OPENAI_BASE_URL` + `OPENAI_API_KEY`. Default provider is **Google Gemini** via its OpenAI-compatible endpoint (`https://generativelanguage.googleapis.com/v1beta/openai/`), models `gemini-2.5-flash` (vision + summary) and `text-embedding-004` (768-dim). The key is left blank in `.env.example`; the worker starts without crashing — it only fails when it actually tries to call the API. Any OpenAI-compatible provider is a one-file swap (ADR-023).

**Six pipeline stages (`app/pipeline/`):**

| Stage | File | What it does |
|-------|------|--------------|
| preprocess | `preprocess.py` | Fetches the document from Supabase Storage via service-role signed URL; converts PDF pages to base64 image data URIs via pypdfium2 |
| extract | `extract.py` | Sends image(s) to the vision LLM with a strict prompt; validates the response with a Pydantic schema; low-confidence fields → `needs_review` status |
| classify | `classify.py` | Maps the LLM's free-text document type to the `record_type` enum (`lab_report`, `prescription`, `imaging`, `discharge_summary`, `vaccination`, `other`) |
| normalise | `normalise.py` | Converts raw observation values to canonical `lab_value` rows; analyte aliases and unit normalisation mirror `packages/core/src/lab.ts` so web and worker stay in sync |
| embed | `embed.py` | Chunks the extracted text; calls the embedding model; produces `record_embedding` rows (768-dim vector) for future RAG Q&A (Should-have) |
| summarise | `summarise.py` | Generates a one-line summary in English and Hindi; appends the mandatory "not medical advice" disclaimer to both |

### `POST /api/ai/callback` (`apps/web/src/app/api/ai/callback/route.ts`)

- **HMAC verification:** reads raw body as text, computes `sha256=<hex>` over it using `AI_CALLBACK_SECRET`, constant-time comparison against `X-Signature` header. Any mismatch → 401.
- **Zod schema validation** covers `record_id`, `status`, `extracted`, `lab_values`, `medications`, `embeddings`, `summary`, `summary_hi`.
- **Service-role writes only** — uses `createServiceClient()` so RLS is bypassed and the callback can write across the family boundary without a user JWT.
- **Idempotent child-row writes** — `family_id` and `member_id` are derived server-side from the `health_record` row (never trusted from the payload). Child tables are wiped and re-inserted per `record_id` so re-extraction is safe.

### Realtime UI

- **`useRecordRealtime` hook** (`apps/web/src/hooks/use-record-realtime.ts`) — subscribes to `health_record` Supabase Realtime channel filtered by `id`; falls back to 4-second polling if the channel does not fire within a grace period. Returns the live `ocr_status`.
- **`ProcessingCard`** — displayed on the record detail page when `ocr_status` is `pending` or `processing`; shows a spinner, stage label (en+hi), and a cancel/re-extract option. Disappears on `done`. On `needs_review`: replaced by a banner prompting the user to review extracted values.
- **`failed` state** — error card with a re-extract button; Lucide `AlertTriangle` icon with label (never colour alone).
- Calm Indigo tokens throughout; `prefers-reduced-motion` respected.

### Member Trend Chart (`/members/[id]/trends`)

- Dependency-free accessible SVG rendered server-side per analyte (HbA1c, Fasting Glucose, Systolic BP, etc.).
- Ref-range band drawn as a translucent rect; data points plotted as circles with flag colouring (high/low/normal).
- Icon + label status summary above each chart (never colour alone — WCAG AA).
- `<table>` with `sr-only` class provides screen-reader fallback for every chart.
- Pixel-verification deferred — requires a live worker + Gemini key + populated `lab_value` rows.

### Evaluation Harness (`services/ai/eval/`)

- `golden.jsonl` — 10 synthetic, de-identified golden records covering lab reports, prescriptions, and discharge summaries.
- `run_eval.py` — drives the full pipeline against each golden record; collects extracted fields.
- `score.py` — computes field-level accuracy (exact match + normalised unit match); prints a structured report. Target: ≥90% field accuracy (Risks.md T1 gate).
- `README.md` — instructions for running once a Gemini key is set.
- Intended to grow to 50 de-identified records before M2 production sign-off.

---

## Modified / Created Files

**`supabase/migrations/`:** `0006_ai_pipeline.sql`

**`supabase/tests/`:** `rls_isolation.test.sql` (extended)

**`services/ai/`:** `pyproject.toml`, `.env.example`, `app/__init__.py`, `app/config.py`, `app/llm.py`, `app/db.py`, `app/main.py`, `app/worker.py`, `app/callback.py`, `app/schemas.py`, `app/pipeline/__init__.py`, `app/pipeline/preprocess.py`, `app/pipeline/extract.py`, `app/pipeline/classify.py`, `app/pipeline/normalise.py`, `app/pipeline/embed.py`, `app/pipeline/summarise.py`, `eval/run_eval.py`, `eval/score.py`, `eval/golden.jsonl`, `eval/README.md`, `tests/` (6 test files)

**`apps/web/src/`:** `app/api/ai/callback/route.ts`, `hooks/use-record-realtime.ts`, `components/processing-card.tsx`, `app/(app)/members/[id]/trends/page.tsx`, `lib/supabase/service.ts` (server-only guard added), `lib/env.ts` (`AI_CALLBACK_SECRET` added)

**`packages/core/src/`:** `lab.ts` (canonical analyte + unit normalisation), `lab.test.ts`

**`.env.example`** — `AI_CALLBACK_SECRET` present; worker vars in `services/ai/.env.example`

---

## Commit Log

| Commit | Message |
|--------|---------|
| `fb716dc` | feat(ai): add pgmq_send enqueue RPC; wire ingest to it (0006 pt.1) |
| `5131f31` | fix(ai): drop duplicate service-role env; add server-only guard to service client |
| `84f73f9` | feat(ai): worker drain-loop skeleton + HMAC callback spine (stub result) |
| `db78dae` | feat(ai): preprocess + vision extract + classify (real reading) |
| `59786a7` | fix(ai): extract.run falls back safely on pydantic ValidationError + covering test |
| `ed59c14` | feat(ai): 0006 lab_value/medication/record_embedding + RLS + callback persistence |
| `82c7624` | feat(ai): normalise raw values → lab_value + member trend chart |
| `f058245` | fix(test): ingest contract expects pgmq_send object payload (Task 1 regression) |
| `ec04dc6` | fix(ui): trend chart uses --color-warn token (was nonexistent --color-warning) |
| `79d06ac` | feat(ai): embed records → record_embedding (pgvector, 768-dim guarded) |
| `e19ea71` | feat(ai): plain-language summary (en+hi) with mandatory disclaimer |
| `1758d3c` | feat(ai): realtime record states — processing/review/error cards |
| `fb4b16c` | fix(ai): remove dead needs_review ProcessingCard branch; tighten ocr_status union; re-extract on needs_review |
| `6e6519f` | test(ai): T1 extraction eval harness + scoring (synthetic golden set) |

---

## Key Design Decisions

**OpenAI-compatible SDK as the provider abstraction (ADR-023).** Rather than hard-coding the Anthropic SDK (which ADR-010 assumed), the worker uses `openai.AsyncOpenAI(base_url=..., api_key=...)`. Any provider that speaks the OpenAI REST API (Gemini, Claude via OpenAI-compat shim, local Ollama, etc.) is a one-line change to `.env`. The key is left blank so the repo never contains a credential and the worker can start (and be test-imported) without a live API key.

**`pgmq_send` as a SECURITY DEFINER RPC.** The anon client (used in `POST /api/ingest`) cannot call `pgmq.*` functions directly — they are superuser-owned. Wrapping the enqueue in a `SECURITY DEFINER` function owned by the service role lets the ingest route add jobs to the queue while keeping the anon key's privilege surface minimal.

**Idempotent callback via delete-then-insert.** On re-extraction, the handler deletes all `lab_value`, `medication`, and `record_embedding` rows for the `record_id` before inserting the new batch. This avoids stale duplicate rows without needing an upsert key per analyte — simpler schema, correct behaviour.

**`family_id`/`member_id` never trusted from payload.** The callback derives these from the `health_record` row server-side. If the payload could supply `family_id`, a compromised worker key could write data into any family. Deriving server-side means the service-role key's blast radius is limited to updating the correct record.

**Normalise mirrors `lab.ts`.** The Python `normalise.py` analyte canonical map and unit aliases are kept in sync with `packages/core/src/lab.ts` manually. This avoids a cross-language import dependency while keeping the trend chart and the pipeline consistent. A future `packages/core/lab-catalog.json` could become the shared source of truth.

---

## Unfinished Work / Deferred

- **Live pixel-verification** of `ProcessingCard` + trend chart — requires a real Gemini key + running dev server + a record with `lab_value` rows. Explicitly deferred; not a code-correctness issue.
- **Render prod deploy** — deferred until the PHI-to-LLM DPA / zero-retention posture (T5) is reviewed. Dev/test uses synthetic data only.
- **Migration `0006` applied to prod** — pending; operator task to run before merging to `main`.
- **Eval golden set expansion** — currently 10 synthetic records; target is 50 de-identified real-format records before M2 production sign-off.
- **ReviewCard (human-in-the-loop correction UI)** — designed in `UX-Plan.md` §8; not yet built. Lands in Sprints 8–10.
- **Per-record AI cost logging** — not yet implemented.
- **RAG Q&A UI** — embeddings are written (Should-have infrastructure is done); the Q&A retrieval + answer layer ships as Should in Sprints 11–13.

---

## Verification at Completion

- `pnpm --filter web build` → green; zero TypeScript errors.
- `pytest services/ai/tests/` → 24 tests passing (classify, callback, extract, normalise, summarise, eval-scoring).
- `packages/core` Vitest → 54 tests passing (includes `lab.ts` analyte/unit normalisation).
- RLS isolation SQL suite — CI `db` job verified; no local psql available (documented in Sprint 7 task notes).
- No PHI fields or secrets appear in any `console.log`, `print`, or Sentry capture in the added code.
- The `AI_CALLBACK_SECRET` and `OPENAI_API_KEY` are names-only in `.env.example`; real values are never committed.
- Live end-to-end test (upload document → worker processes → trend chart) is **deferred** pending a Gemini key and running dev server.
