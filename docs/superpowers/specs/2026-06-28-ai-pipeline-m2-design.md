# Sprint 7 — AI Pipeline (M2) Design

> **Status:** approved-in-brainstorm 2026-06-28 · **Milestone:** M2 (AI auto-organise) · **Provider:** FreeLLMAPI (demo)
> **Authority:** extends `docs/database/Schema.md`, `docs/api/API-Spec.md`. ADRs: 004 (no Redis), 008 (async), 011 (embeddings day 1), 020 (notifications).

## 0. Posture — DEMO

This is a **demo** build. The LLM provider is **FreeLLMAPI** (a local, self-hosted, OpenAI-compatible proxy aggregating free provider tiers) running at `http://localhost:3001/v1`. Free models route through third-party providers and degrade late-day.

- **Feed it synthetic / de-identified documents only.** No real patient PHI until the production model + zero-retention/DPA review (T5) is done.
- Model choice is revisited before real public use (user decision, 2026-06-28).
- Worker deploy to Render is **deferred**; Sprint 7 runs worker + proxy locally.

## 1. Goal & exit criteria

Upload a medical document → it is read, classified, normalised, embedded, summarised, and appears as a structured record on the member timeline, live.

**Exit gate:** upload a synthetic lab report → within seconds the record flips `pending → processing → done`, shows extracted title/type/date/facility, typed lab values on a trend, a plain-language summary, and is embedded for future RAG. Direct/cross-family access blocked by RLS.

## 2. Provider integration

- `services/ai/` uses the **`openai` Python SDK** against env `OPENAI_BASE_URL` (`http://localhost:3001/v1`) + `OPENAI_API_KEY` (`freellmapi-…`). Both env-only, never committed; added to `.env.example` by name.
- Thin `app/llm.py` wrapper isolates the provider so swapping it later is one file.
- **Models, env-pinned with `"auto"` fallback** (pinning = reproducible eval):
  - `EXTRACTION_MODEL` — vision (e.g. Gemini 2.5 Flash / GPT-4o)
  - `SUMMARY_MODEL` — text
  - `EMBEDDING_MODEL` — multilingual (en + hi)
- Vision uses OpenAI `image_url` content blocks (base64 data URIs); the proxy auto-restricts to vision-capable models when an image is present.

## 3. Worker architecture (chosen: A — pgmq drain loop)

`services/ai/app/`:
- `main.py` — FastAPI: `GET /healthz` + a background asyncio **drain loop**.
- `db.py` — asyncpg pool using the Supabase **service-role** connection (server-only).
- `llm.py` — provider wrapper.
- `callback.py` — HMAC-signed POST to Next `/api/ai/callback`.
- `pipeline/` — one module per stage (§4), each a pure-ish function `(input) -> output`, unit-testable in isolation.

**Loop:** `pgmq.read('ai_jobs', vt, n)` → for each job (a `health_record.id`): set `ocr_status='processing'` → run stages → POST result → `pgmq.delete` on success / `pgmq.archive` on permanent failure. Visibility timeout (`vt`) gives free retries when FreeLLMAPI is rate-limited; a max-attempts guard archives poison jobs to `failed`.

Rejected: B (pg_cron→HTTP, couples scheduling to DB; pg_cron reserved for M3 reminders), C (Realtime trigger, fragile reconnect/no retry).

## 4. The six stages (built in this order; each boundary is shippable)

1. **preprocess** (`preprocess.py`) — fetch file from Supabase Storage via service role; PDF → page images (downscale); multipage handling. Output: list of image bytes + meta.
2. **extract** (`extract.py`) — vision LLM → strict JSON `{type, title, doc_date, facility, doctor, raw_values[]}` via JSON-schema-constrained prompt. Low confidence → mark `needs_review`.
3. **classify** (`classify.py`) — validate/map `type` to the existing `record_type` enum (folded into the extract call; separate validator keeps it testable).
4. **normalise** (`normalise.py`) — raw values → canonical analytes + units (HbA1c, fasting glucose, BP, TSH, Hb, creatinine, …); parse/validate dates. Pure function, heavily unit-tested.
5. **embed** (`embed.py`) — `/v1/embeddings` → vectors for `record_embedding` (pgvector).
6. **summarise** (`summarise.py`) — text LLM → `summary` + `summary_hi`, with mandatory "not medical advice" disclaimer appended.

## 5. Schema additions — migration `0006_ai_pipeline.sql`

`health_record` already has `summary`, `summary_hi`, `extracted`, and the `ocr_status` enum — **no changes there**. Net-new (authored into `docs/database/Schema.md`):

- `enable extension pgvector` (guarded like pgmq for vanilla-PG/CI).
- **`lab_value`** — `id, family_id, record_id→health_record, member_id, analyte, value numeric, unit, measured_at, ref_low, ref_high, flag`. Feeds trends.
- **`record_embedding`** — `id, family_id, record_id, member_id, chunk text, embedding vector(N), created_at`.
- **`medication`** — `id, family_id, member_id, record_id, name, dose, frequency, active bool, started_at`.

**RLS (Dev Rule 2, non-negotiable, same PR):** every new table gets `family_id` denormalised + 4 policies via `auth_family_ids()` + `set_updated_at()` where applicable + an isolation test added to `supabase/tests/rls_isolation.test.sql` (family-B cannot read/write family-A). CI `db` job must stay green.

## 6. Callback contract — `POST /api/ai/callback`

Net-new route (`apps/web/src/app/api/ai/callback/route.ts`):
- Verify **HMAC** signature header against shared secret env (`AI_CALLBACK_SECRET`); reject on mismatch (401).
- Zod-validate body: `{ record_id, status, extracted, lab_values[], medications[], embeddings[], summary, summary_hi }`.
- Service-role writes: upsert extracted fields on `health_record`, insert `lab_value`/`medication`/`record_embedding` rows, set `summary*`, flip `ocr_status` to `done`/`needs_review`/`failed`.
- Idempotent on `record_id` (re-extract safe). Contract test (zod + HMAC happy/invalid path).

## 7. Realtime UI

- Record detail + `/records` timeline subscribe to `health_record` changes (Supabase Realtime; fallback poll).
- States designed per `UX-Plan.md` §8 + Design-System DoD: `ProcessingCard` (pending/processing) → `ReviewCard` (done: structured fields + lab values + summary) → error state (failed) → `needs_review` banner. Lucide icons, Calm Indigo tokens, en/hi via `t()`, responsive, reduced-motion/elder-mode, pixel-verified via agent-browser.

## 8. Testing (P0)

- **T1 eval set** — ~50 de-identified docs in `services/ai/eval/`; pytest golden scores typed lab-value field accuracy ≥ ~90%. **Built before trusting extraction** (Dev Rule 5). For the demo it is the accuracy safety-net, not a launch gate.
- **RLS isolation** — new tables added to the SQL harness (P0).
- **Callback contract** — zod + HMAC (P1).
- **normalise** unit tests — analyte/unit/date mapping (P0, pure logic).

## 9. Secrets (names only; values in env)

`OPENAI_BASE_URL`, `OPENAI_API_KEY`, `EXTRACTION_MODEL`, `SUMMARY_MODEL`, `EMBEDDING_MODEL`, `AI_CALLBACK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`. Added to `.env.example` by name. Service-role/db creds are worker-only, never `NEXT_PUBLIC_*`.

## 10. Build order (partial-completion safe)

1. `services/ai/` skeleton + `llm.py` + healthz + pgmq drain loop (no stages) — proves the job lifecycle end-to-end with a stub result.
2. `/api/ai/callback` + HMAC + `ocr_status` transitions + Realtime UI states — **demoable spine** (pending→done with stub data).
3. preprocess + extract + classify — real reading.
4. migration `0006` + RLS + isolation tests; normalise → `lab_value` → trend chart.
5. embed → `record_embedding`.
6. summarise → `summary`/`summary_hi`.
7. T1 eval set + accuracy pass.

Each numbered step ends at a working boundary; if the 2-day window closes mid-way, the last completed step still demos.

## 11. Out of scope (this sprint)

RAG Q&A UI (ADR-011 — embeddings written now, UI later), refill prediction, Render deploy, production model selection, PHI/DPA review (T5), real patient data.
