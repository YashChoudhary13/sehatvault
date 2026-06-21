# API Specification

> The contract for every operation, documented before implementation. Per `../docs/Decisions.md` (ADR-002) there is **no separate API gateway**: the "API" is (a) **Supabase/PostgREST** for RLS-guarded CRUD reads, (b) **Next.js Route Handlers + Server Actions** for mutations with side-effects, and (c) the **Python AI worker** contract. This document treats them uniformly as a REST surface so behaviour is unambiguous.
>
> **Base (web):** `https://app.sehatvault.in` · **AI service (internal):** `https://ai.sehatvault.internal`
> **All times** ISO-8601 UTC (`2026-06-18T09:30:00Z`); **dates** `YYYY-MM-DD`. **All IDs** uuid.

---

## 1. Conventions

**Auth:** Supabase session JWT in `Authorization: Bearer <jwt>` (browser uses the SSR client; the JWT carries `sub = auth.uid()`). Public share endpoints take a **token**, not a JWT.

**Response envelope:**
```json
{ "data": { /* resource */ }, "error": null }
{ "data": null, "error": { "code": "forbidden", "message": "…", "details": {} } }
```
**Error codes:** `unauthenticated` (401), `forbidden` (403, RLS/permission), `not_found` (404), `validation` (422, zod), `rate_limited` (429), `conflict` (409, idempotency), `expired` (410, share), `server` (500).

**Pagination (lists):** `?limit=20&cursor=<opaque>` → `{ data: [...], page: { next_cursor } }`. Default limit 20, max 100.

**Idempotency:** mutating uploads/shares/exports accept `Idempotency-Key`; replays return the original result.

**Validation:** every request body is parsed by a **zod** schema shared with `packages/db`; failures return `422` with field paths.

**Permission model (single-owner MVP, ADR-009):** every data row is reachable only if its `family_id ∈ auth_family_ids()`. RLS enforces this at the database; route handlers re-check before privileged actions (signed URLs, exports). Public share access is governed solely by a valid, unexpired, unrevoked `share_grant` and its `scope`.

---

## 2. Authentication flow (phone OTP — ADR-007)

```
POST /auth/otp/start      { "phone": "+9198XXXXXX21" }            → 200 { "data": { "sent": true } }
POST /auth/otp/verify     { "phone": "+9198XXXXXX21", "code": "123456" }
                          → 200 { "data": { "session": {…}, "is_new_user": true } }
POST /auth/logout         → 204
```
- Implemented via **Supabase Auth phone provider** (MSG91 SMS, DLT-registered templates). Rate-limited per phone + per IP.
- On first verify, a trigger creates `app_user` + a default `family` ("My Family"). The client then runs onboarding (add first member).
- **App-lock** is client-side: `PUT /me/app-lock { "pin": "1234" }` stores `app_lock_hash` (argon2); re-entry is local, not a server round-trip.

---

## 3. Me & family

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| `GET` | `/me` | JWT | → `app_user` + owned `family` summary |
| `PATCH` | `/me` | JWT | `{ locale?, elder_mode? }` |
| `PUT` | `/me/app-lock` | JWT | `{ pin }` → stores hash |
| `GET` | `/families/:id` | JWT | owner-only (RLS) |
| `PATCH` | `/families/:id` | JWT | `{ name }` |

---

## 4. Members (FHIR Patient)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| `GET` | `/members` | JWT | — | `[member_profile]` for the family |
| `POST` | `/members` | JWT | see below | `member_profile` |
| `GET` | `/members/:id` | JWT | — | `member_profile` |
| `PATCH` | `/members/:id` | JWT | partial body | updated |
| `DELETE` | `/members/:id` | JWT | — | 204 (cascades records; logged) |

**POST /members request:**
```json
{
  "display_name": "Ramesh Kumar",
  "relationship": "father",
  "dob": "1957-04-12",
  "sex": "male",
  "blood_group": "O+",
  "allergies": ["penicillin"],
  "chronic_conditions": ["type 2 diabetes", "hypertension"],
  "emergency_contact": { "name": "Priya", "phone": "+9198XXXXXX21", "relation": "daughter" }
}
```

---

## 5. Records & the ingest pipeline (the core loop)

### 5.1 Create + upload (async — ADR-008)
```
POST /records/ingest        (multipart or pre-signed flow)
Headers: Idempotency-Key: <uuid>
Body (json part): { "member_id": "…", "type": "lab_report"?, "record_date": "2026-06-18"? }
Files: one or more images/PDF
→ 202 Accepted
{ "data": { "record_id": "…", "ocr_status": "pending" } }
```
**Behaviour:** server stores files to `documents/{family_id}/{member_id}/{record_id}/…`, inserts `health_record (ocr_status=pending)`, **enqueues a `pgmq` job** `{ record_id }`, returns immediately. The browser subscribes to the record via **Supabase Realtime** (or polls `GET /records/:id`) for status transitions `pending → processing → done | needs_review | failed`.

### 5.2 Read / list / edit
| Method | Path | Notes |
|---|---|---|
| `GET` | `/members/:id/records?type=&from=&to=&cursor=` | timeline feed (paginated, `record_date desc`) |
| `GET` | `/records/:id` | full record incl. `ocr_status`, `observations[]`, `medications[]` |
| `GET` | `/records/:id/file?page=0` | → `{ url, expires_at }` short-lived **signed URL** (server checks RLS first) |
| `PATCH` | `/records/:id` | edit `type, record_date, facility, doctor, title` (human-in-the-loop) |
| `POST` | `/records/:id/reextract` | re-enqueue extraction (e.g., after a better scan) |
| `DELETE` | `/records/:id` | removes row + storage objects; logged |

### 5.3 Review-card correction (M-11)
```
PATCH /records/:id/review
{
  "observations": [ { "id": "…", "value_num": 7.8, "unit": "%", "canonical_name": "HbA1c" } ],
  "medications":  [ { "id": "…", "drug_name": "Metformin", "strength": "500 mg", "frequency": "BD" } ],
  "accept": true
}
→ 200  // sets ocr_status='done', confidence overridden, user edits are source of truth
```

### 5.4 AI worker callback (internal, service-role + HMAC)
```
POST /api/ai/callback
Headers: X-Signature: hmac-sha256(body, AI_CALLBACK_SIGNING_SECRET)
{
  "record_id": "…",
  "status": "done" | "needs_review" | "failed",
  "confidence": 0.93,
  "classification": "lab_report",
  "record_date": "2026-06-18",
  "facility": "SRL Diagnostics",
  "doctor": "Dr. Rao",
  "summary": "Blood test — HbA1c 7.8% (slightly high).",
  "observations": [ { "raw_name": "HbA1c", "canonical_name": "HbA1c", "loinc_code": "4548-4",
                      "value_num": 7.8, "unit": "%", "flag": "high", "confidence": 0.95 } ],
  "medications": [],
  "embeddings_written": 4
}
→ 200
```
Only the worker (holding the secret + service role) may call this. The handler validates the signature, upserts child rows **idempotently** by `record_id`, and stamps `family_id` from the record.

---

## 6. Trends (M-14)
```
GET /members/:id/trends?codes=HbA1c,Fasting Glucose,Systolic BP
→ { "data": {
      "HbA1c": { "unit": "%", "ref": { "low": 4.0, "high": 5.6 },
                 "points": [ { "date": "2026-01-10", "value": 8.1, "flag": "high" },
                             { "date": "2026-06-18", "value": 7.8, "flag": "high" } ],
                 "direction": "improving" } } }
```
Backed by the `observation(member_id, canonical_name, observed_at)` index. `direction` computed in `packages/core`.

---

## 7. Medications & reminders

| Method | Path | Notes |
|---|---|---|
| `GET` | `/members/:id/medications?active=true` | active med list |
| `POST` | `/members/:id/medications` | manual add |
| `PATCH` | `/medications/:id` | edit / set `active=false` |
| `GET` | `/members/:id/reminders` | upcoming |
| `POST` | `/reminders` | `{ member_id, kind, title, schedule_rrule?, next_fire_at, channels[] }` |
| `PATCH` | `/reminders/:id` | reschedule / cancel |
| `POST` | `/reminders/:id/ack` | `{ "state": "done" \| "skipped" }` (Taken/Skip) |

**Reminder firing (internal):** `pg_cron` → `POST /api/cron/reminders` (service-role, secret header) selects `reminder where state='scheduled' and next_fire_at <= now()`, dispatches per `channels` (web-push/in-app; WhatsApp if enabled), advances `next_fire_at` from the RRULE.

---

## 8. Doctor share (M-17) — the trust-critical surface

### 8.1 Owner creates/manages a share (JWT)
```
POST /shares
{ "member_id": "…",
  "scope": { "types": ["lab_report","prescription"], "date_from": "2026-01-01", "date_to": null, "include_docs": true },
  "ttl_hours": 24 }
→ 201 { "data": { "id": "…", "url": "https://app.sehatvault.in/s/HhSn…", "qr_svg": "<svg…>", "expires_at": "2026-06-19T09:30:00Z" } }
```
- Server generates a **128-bit random token**, stores only its **hash** (`token_hash`), returns the raw token **once** in the URL/QR.

| Method | Path | Notes |
|---|---|---|
| `GET` | `/shares` | list active/expired shares (consent dashboard) |
| `POST` | `/shares/:id/revoke` | sets `state='revoked'`, `revoked_at=now()` — effective immediately |

### 8.2 Public consumption (no JWT — token only)
```
GET /s/:token            → server resolves hash; if active & !expired:
                           renders read-only summary (timeline + meds + key trends + docs per scope);
                           logs access to access_log (actor='share-link'); sends `noindex`, no-cache.
                           else → 410 expired / 404.
GET /s/:token/file?doc=… → short-lived signed URL, only if scope.include_docs and within scope.
```
Every `GET /s/:token` writes an `access_log` row `{ share_grant_id, actor:'share-link', meta:{ ip_trunc, ua } }`.

---

## 9. Consent, audit, export, delete (DPDP — M-18..M-20)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/consent/shares` | every share + state (same as `/shares`) |
| `GET` | `/consent/access-log?member_id=&cursor=` | immutable access history (read-only) |
| `POST` | `/account/export` | enqueues an export job → `{ job_id }`; when ready, `GET /account/export/:job_id` → signed `.zip` (documents + JSON of all structured data). Logged. |
| `POST` | `/account/delete` | `{ "confirm": "DELETE" }` → soft-locks, then a job hard-deletes family cascade + all storage objects; writes a final tombstone `access_log`. Irreversible; logged. |

---

## 10. Python AI service (internal contract)

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | liveness/readiness |
| `POST` | `/extract` | **debug/local only** — `{ record_id }` runs the pipeline synchronously; prod uses the queue |
| *(worker)* | `pgmq` consume | pulls `{ record_id }`, runs preprocess→extract→classify→normalise→embed→summarise, then `POST /api/ai/callback` |

**Extraction output schema (the strict JSON the LLM must return — validated by pydantic):**
```json
{ "record_type": "lab_report",
  "record_date": "2026-06-18",
  "facility": "SRL Diagnostics", "doctor": "Dr. Rao",
  "observations": [ { "name": "HbA1c", "value": "7.8", "unit": "%", "ref_range": "4.0-5.6", "confidence": 0.95 } ],
  "medications":  [ { "drug_name": "Metformin", "strength": "500 mg", "frequency": "twice daily", "duration": "30 days", "confidence": 0.9 } ],
  "diagnoses":    [],
  "overall_confidence": 0.93 }
```
Fields below the confidence threshold cause `status="needs_review"` so the user verifies — **never** a silent wrong value (Risks.md T1).

---

## 11. Webhooks (Should-have)
| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/webhooks/whatsapp` | Meta inbound: a forwarded document → resolve sender→family → ingest as `source='whatsapp'` → reply with the summary. Verifies Meta signature. |
| `POST` | `/api/webhooks/razorpay` | payment/subscription events → update `subscription`. Verifies signature. |

---

## 12. Rate limits & abuse (MVP-pragmatic)
- OTP: per-phone + per-IP throttle (handled by Supabase + an edge check).
- `/records/ingest`: per-user burst cap (protects AI cost — Risks.md B1).
- `/s/:token`: per-IP cap; on repeated invalid tokens, slow down (mitigates token guessing — Risks.md C1).
- All limits return `429` with `Retry-After`.

---

## 13. Endpoint inventory (checklist for "documented before built")
Auth(3) · Me/Family(5) · Members(5) · Records(8) · Trends(1) · Meds(3) · Reminders(5) · Shares owner(4) · Shares public(2) · Consent/Audit/Export/Delete(4) · AI(2)+callback(1) · Webhooks(2). **= 45 endpoints**, each with a zod request schema and a typed response. Implementation order follows `../roadmap/Sprints.md`.
