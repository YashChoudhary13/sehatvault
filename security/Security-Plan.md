# Security & Privacy Plan

> "Trust *is* the product" (README §7, §17). This consolidates the security posture decided across `../docs/Phase0-Architecture-Review.md §0.3–0.4`, `../docs/Decisions.md` (ADR-005/007/012), and `../database/Schema.md §5–6`. Scope: **MVP**, DPDP-defensible, solo-operable.

---

## 1. Authentication & sessions
- **Phone OTP** via Supabase Auth + MSG91 (DLT templates). No passwords to leak.
- **JWT sessions** (short-lived access + refresh); `middleware.ts` refreshes and protects `(app)` routes.
- **App-lock**: client-side PIN (argon2 hash in `app_user.app_lock_hash`), optional WebAuthn/biometric where supported. Gates re-entry to an already-authenticated session.
- **Service-role key** is server/worker-only; the browser only ever holds the **anon** key (safe under RLS). Never put privileged keys in `NEXT_PUBLIC_*`.

## 2. Authorization / permission model
- **Single source of truth:** Postgres **RLS**, default-deny, keyed on `family_id ∈ auth_family_ids()` (ADR-009). One helper function is the choke-point for all policies.
- **Defense in depth:** route handlers re-check ownership before privileged side-effects (signed URLs, export, delete) — RLS is the backstop, not the only gate.
- **Public share** access is governed *only* by a valid, unexpired, unrevoked `share_grant` + its `scope`. No JWT, no broader access.
- **Audit table is append-only from clients** (insert via service role only), so users can read but never alter their access history.

## 3. Data protection (encryption) — ADR-012
- **In transit:** TLS 1.2+ everywhere (Vercel, Supabase, Render, LLM API).
- **At rest:** AES-256 (Supabase Postgres + Storage).
- **Documents:** private bucket; **no public URLs**; access only via server-issued **short-lived signed URLs** (~60s) after a permission check.
- **Tokens:** share tokens are 128-bit random; only their **hash** is stored (`token_hash`).
- **Residency:** all PHI in `ap-south-1` (Mumbai).
- **Conscious deferral:** app-layer field-level / per-object envelope encryption is **out of MVP** (see threat model §6 for exactly what that means). Revisit trigger: SDF threshold / B2B2C / first audit.

## 4. The LLM-residency control (Risk T5) — the one that needs explicit ownership
- PHI is sent to Claude's API for extraction → it **leaves the India region**.
- **Controls:** DPA with **no-training / zero-retention**; send the **minimum** payload; **redact** obvious direct identifiers pre-call where feasible; route **all** AI calls through a single reviewed client (`services/ai/clients/llm.py`) so there's one auditable egress point; record the flow in the **record of processing**; disclose in the privacy policy + consent copy.
- **Escalation path:** in-region / self-hosted extraction model if residency posture tightens.

## 5. DPDP Act 2023 compliance (README §17)
| DPDP duty | How we meet it (MVP) |
|---|---|
| **Free, specific, informed consent** | Explicit consent at signup + per-share scope; plain-language copy in en/hi. |
| **Withdrawal as easy as grant** | Consent dashboard: revoke any share/access in one tap (`M-18`). |
| **Purpose limitation / minimisation** | Collect only health-record data; no data sale, ever; minimal payloads to AI. |
| **Right to access/correct** | Timeline + review card (correct any extracted value); full record view. |
| **Right to erasure** | `POST /account/delete` → family cascade + storage purge + tombstone log (`M-20`). |
| **Data portability** | `POST /account/export` → machine-readable archive (docs + JSON). |
| **Breach process** | Incident runbook (§7) + immutable `access_log` for forensics; notify DPB per rules. |
| **Children/dependents** | Members include minors managed by the owner; verifiable-consent + emergency-treatment exemption noted; design accommodates future guardian-consent. |
| **Designed for SDF** | DPO/DPIA/independent-audit *not built* at MVP but the audit log, consent ledger, and single AI-egress point make them cheap to add. |

## 6. Threat model (STRIDE-lite; what we defend, what we accept)
| Threat | Vector | Mitigation | Residual (accepted at MVP) |
|---|---|---|---|
| **Cross-family read** | RLS gap / logic bug | default-deny RLS on every table + CI isolation suite (T4) | ~0 if CI invariant holds |
| **Doc theft** | Guessing storage URLs | private bucket + signed-URL-only + storage RLS | — |
| **Share-link abuse** | Token guess / replay / over-broad | 128-bit token, hash-at-rest, server expiry+revocation, scope enforced, access logged, rate-limited, `noindex`; global kill-switch | a *valid leaked link* works until expiry/revoke (by design — like any share link) |
| **Platform compromise** | Supabase/service-key exposure reads plaintext | least-privilege keys, secret hygiene, no client service-key | **plaintext readable** → the gap ADR-012 names; revisit at SDF |
| **PHI egress** | LLM provider | DPA, minimisation, single egress point (§4) | out-of-region processing (T5) |
| **Account takeover** | OTP interception / SIM swap | OTP throttling, app-lock PIN, short sessions | SIM-swap risk inherent to phone-OTP |
| **Tampered AI callback** | Forged results | HMAC signature + service-role on `/api/ai/callback` | — |
| **Injection / XSS** | User/LLM text rendered | parameterised SQL, React escaping, CSP, sanitise LLM HTML | — |

## 7. Operational security
- **Secrets** in Vercel/Render/Supabase env stores; rotate on suspicion; never logged (Sentry scrubbing + log redaction of tokens/PHI).
- **Dependency scanning** (Dependabot / `pnpm audit`, `pip-audit`) in CI.
- **Least privilege:** anon key client-side; service role only server/worker.
- **Incident runbook:** detect (Sentry/anomaly) → contain (revoke keys/shares, kill-switch) → assess scope via `access_log` → notify (DPB + affected principals per DPDP) → remediate → post-mortem + new `Risks.md` entry.
- **Backups:** Supabase PITR; export/delete flows tested so erasure is real (not just hidden).

## 8. Security acceptance gates (must pass to launch)
1. RLS isolation CI suite **green** (zero cross-family leakage).
2. Direct document URL without auth → **403**; signed URL expires.
3. Share link: scope respected, expiry enforced, revoke immediate, access logged.
4. Export complete & openable; delete truly purges (rows + storage).
5. No privileged key reachable from the browser bundle (build-time check).
6. Privacy policy + consent copy live in en/hi; AI-egress disclosed.
