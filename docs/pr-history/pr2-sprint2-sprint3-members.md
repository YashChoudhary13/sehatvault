# PR2 — Sprint 2 Completion + Sprint 3: App Shell & Member CRUD

| | |
|---|---|
| **Commits** | `2484b8f` → `fb17355` (11 commits on `main`) |
| **Branch** | `main` (direct; squash workflow) |
| **Milestone** | M0 exit gate ✅ + M1 start |
| **Sprints covered** | Sprint 2 completion (PIN + i18n) · Sprint 3 (App Shell + Members) |
| **Date completed** | 2026-06-23 |
| **Status** | ✅ On `main`; `pnpm --filter web build` green; 7 routes; zero type errors |

---

## What Was Implemented

### Sprint 2 completion — App-lock PIN (server-verify)

A convenience re-entry gate layered over an already-authenticated Supabase session — not a second auth boundary. The argon2 hash lives server-side only; the raw hash never crosses to the browser; the client receives only `{ ok: boolean }`.

- **`packages/core/src/pin.ts`** — `validatePin()`: 4–6 digits, digits-only, trivial-PIN blocklist (`0000`, `1234`, repeating/sequential runs). Framework-free; Vitest-tested.
- **`apps/web/src/app/actions/pin-actions.ts`** (`"use server"`) — `setAppLockPin`, `verifyAppLockPin`, `clearAppLockPin`. `verifyAppLockPin` is rate-limited (5 attempts / 15-minute window via in-process counter). No PIN or hash is logged anywhere in the call path.
- **`apps/web/src/components/pin-setup.tsx`** — PIN setup UI in Settings; set / clear; mismatch error. Uses `useT()` for all strings.
- **`AppLock` inner component** (inside `app-shell.tsx`) — re-entry lock screen shown on `visibilitychange` resume after idle; "Forgot PIN" links to email re-auth. `AppLayout` reads `app_lock_hash` once at server render; passes only `hasPinSet: boolean` to the client.
- **RLS harness extended** — positive control (user B can set its own `app_lock_hash`) + negative control (B cannot overwrite A's hash) added to `supabase/tests/rls_isolation.test.sql`.

### Sprint 2 completion — i18n locale switching

- **`apps/web/src/lib/locale-actions.ts`** — `updateUserLocale(locale: "en" | "hi")` Server Action; updates `app_user.locale` via RLS-scoped client.
- **`apps/web/src/components/locale-provider.tsx`** — `LocaleProvider` React Context + `useLocale()` + `useT()` hook. Client Components anywhere inside `(app)` layout call `useT()`. Server Components call `t(locale, key)` directly from `@sehatvault/i18n` after fetching locale from `app_user.locale`.
- **`apps/web/src/components/locale-switcher.tsx`** — English / हिंदी toggle in Settings; optimistic `setLocale` + persisted `updateUserLocale`.
- `AppShell` now accepts `locale: Locale` from the server layout and passes it to `<LocaleProvider initialLocale={locale}>`. `PinSetup` and `AppLock` strings converted from `t(LOCALE, key)` to `useT()`.

---

### Sprint 3 — App Shell & Navigation

**`AppShell` (`apps/web/src/components/app-shell.tsx`)**

Architecture: `LocaleProvider → AppLock → (MainNav + content wrapper) | PinLockScreen`. `AppLock` owns the lock/unlock state and `visibilitychange` listener. On unlock, renders `MainNav` above the padded content wrapper.

**`MainNav` (`apps/web/src/components/main-nav.tsx`)**

Single component; two rendering modes:
- **Mobile (`< md`):** `fixed bottom-0` tab bar with `border-t border-border bg-surface`; icon + label stacked; `style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}` for iOS notch.
- **Desktop (`>= md`):** `fixed left-0 h-full w-56` side rail with `border-r`; brand header; full-width nav items with `rounded-md` active highlight.

Root layout exports `viewport: { viewportFit: "cover" }` (Next.js 15 `Viewport` export). Content wrapper in `AppShell` uses `calc(4rem + env(safe-area-inset-bottom, 0px))` bottom padding so page content clears the tab bar on iOS.

Active state: `bg-primary/10 text-primary` on desktop; `text-primary` + `stroke-[2.5]` icon on mobile. Inactive: `text-muted` + `stroke-2`. All labels from `useT()`.

**`EmptyState` (`apps/web/src/components/empty-state.tsx`)**

`{ icon: LucideIcon; title: string; description: string; actionButton?: ReactNode }`. Centred column; icon in `h-16 w-16 rounded-full bg-border` circle. Used on home when the family has no members.

**Home / family view (`app/(app)/page.tsx`)**

Server Component. Parallel-fetches `app_user.locale` + `family(id, name, member_profile(id, display_name, relationship))` via `Promise.all`. Shows `EmptyState` with "Add Member" link or a tappable member list (each → `/members/:id`). The `handle_new_user()` DB trigger guarantees a family row always exists for authenticated users.

---

### Sprint 3 — Member CRUD

**Domain schema (`packages/core/src/member.ts`)**

`InsertMemberSchema` (Zod): `name`, `relationship`, `dob` required; `sex` mirrors the PG `sex_type` enum (`male | female | other | unknown`); `blood_group`, `allergies: string[]`, `conditions: string[]`, `emergency_contact` optional with defaults. Zod error messages are i18n keys (e.g. `"members.form.error.name_required"`) so the form calls `translate(error.message)` — Zod and i18n stay decoupled.

**Server Actions (`apps/web/src/app/actions/member.ts`)**

All three follow the same pattern: server-side re-validate with `InsertMemberSchema.safeParse()` → `getUser()` guard → RLS-scoped Supabase client → `revalidatePath` + `redirect`. No PHI is logged at any point.

- **`createMember(data)`** — fetches `family.id` RLS-scoped (no explicit `user_id` filter; RLS enforces it); inserts into `member_profile` with `family_id` so the `auth_family_ids()` WITH CHECK passes. Redirects to `/`.
- **`updateMember(id, data)`** — updates row by `id` only; RLS UPDATE policy restricts to family-owned rows. `revalidatePath("/")` + `revalidatePath("/members/[id]")` + `redirect("/members/[id]")`.
- **`deleteMember(id)`** — deletes by `id`; RLS DELETE policy enforces ownership. Redirects to `/`.

**Shared `MemberForm` (`apps/web/src/components/member-form.tsx`)**

`"use client"`. Props: `initialData?: MemberFormInitialData` (DB `string[]` joined to comma-strings for display), `onSubmit: (data: InsertMemberData) => Promise<MemberActionResult>`, `cancelHref: string`. The local `FormSchema` keeps `allergies`/`conditions` as plain strings; `splitList()` converts on submit. Moving the form out of the Create page reduced `/members/new` from 45.6 kB to 626 B; `/members/[id]/edit` is 172 B — both share the bundle.

**`DeleteMemberButton` (`apps/web/src/components/delete-member-button.tsx`)**

`"use client"`. shadcn `AlertDialog` wraps the confirm flow. `useTransition` keeps the UI non-blocking during deletion. Confirm button uses `className="bg-danger text-white hover:bg-danger/90"` (Warm Trust `--color-danger` token). Imports `deleteMember` directly — the `"use server"` directive on the actions file makes this safe from a Client Component.

**Pages**

- **`/members/new`** — 12-line `"use client"` shell: `<MemberForm onSubmit={createMember} cancelHref="/" />`.
- **`/members/[id]`** — Server Component; parallel-fetch member + locale; `notFound()` on missing row; four sections: header (avatar initial, name, relationship, Edit Profile link), Basic Info (`<dl>`), Medical Info, Emergency Contact, Danger Zone (`<DeleteMemberButton>`).
- **`/members/[id]/edit`** — Server Component; maps DB columns to `MemberFormInitialData`; passes `updateMember.bind(null, id) as (data) => Promise<MemberActionResult>` as the `onSubmit` prop. `.bind()` on a Server Action is the idiomatic Next.js 15 pattern for parameterised actions.

**shadcn primitives added** to `apps/web/src/components/ui/`: `alert-dialog`, `form`, `input`, `select`, `label`. `button.tsx` gained a `danger` variant (`bg-danger text-white hover:bg-danger/90`).

**i18n** — 44 new keys across both catalogs: `pin.*` (14), `nav.*` (5), `members.form.*` (17), `members.profile.*` (17) in `en.json` and `hi.json`.

---

## Commit Log

| Commit | Message |
|--------|---------|
| `2484b8f` | feat(core,i18n): add pin validation logic and localized strings |
| `9ab3aef` | test(rls): add positive and negative assertions for app_lock_hash |
| `67cc34e` | feat(web): implement server-verified app-lock pin with argon2 hashing and rate-limiting |
| `d9a1df2` | feat(web): implement dynamic i18n locale switching and provider |
| `dc58647` | feat(i18n,ui): add nav/members empty-state keys, EmptyState and MainNav components |
| `c438221` | feat(web): Sprint 3 scaffolding — nav shell, safe-area layout, family home page |
| `57c6da4` | feat(core,i18n): InsertMemberSchema + member form translation keys (en/hi) |
| `63983c7` | feat(web): create-member flow — shadcn form primitives, Server Action, /members/new page |
| `74151fa` | feat(i18n): add members.profile.* and members.form.edit translation keys (en/hi) |
| `7950a76` | feat(web): add updateMember/deleteMember actions, MemberForm component, DeleteMemberButton with AlertDialog, danger button variant |
| `fb17355` | feat(web): member profile view, edit page, and refactor /members/new to use shared MemberForm |

---

## Key Design Decisions

**PIN is a convenience gate, not an auth boundary.** No migration needed — `app_lock_hash` already existed in `0002_family.sql`. Rate-limiting is in-process (stateless restart resets it; acceptable for an offline-capable UI convenience lock, not a security control). Argon2 hash stored server-side; only `hasPinSet: boolean` crosses to the client at layout render time.

**`useT()` hook over prop-drilling locale.** `LocaleProvider` sits at `AppShell` level and makes locale available to any Client Component in the `(app)` shell without prop drilling or re-fetching. Server Components call `t(locale, key)` directly after fetching locale from `app_user.locale` in a parallel query.

**`onSubmit` callback on `MemberForm`.** The form is action-agnostic; pages provide the specific Server Action. For the Edit page, `updateMember.bind(null, id)` returns a new bound Server Action with the same `(data) => Promise<MemberActionResult>` signature. This is the Next.js 15 idiomatic pattern for parameterised Server Actions passed to Client Components.

**RLS-only ownership for UPDATE/DELETE.** `updateMember` and `deleteMember` filter only by `id` — no redundant `user_id` or `family_id` client-side filter. The RLS UPDATE and DELETE policies on `member_profile` use `auth_family_ids()` to enforce ownership. A second filter would be dead code and a false sense of security.

**`splitList` / join for array fields.** `allergies` and `chronic_conditions` are `text[]` in Postgres. The form represents them as comma-separated strings for UX simplicity; `splitList()` converts back to arrays before the Server Action validates the final `string[]` shape with `InsertMemberSchema`.

---

## Unfinished Work / Deferred to Sprint 4

- Document capture (`CaptureSheet` — camera/gallery/PDF picker)
- Supabase Storage private `documents` bucket + storage RLS policies
- Migration `0004_health_records.sql` — `health_record` table (status enum, `storage_path`, `family_id`, `member_id`, RLS) + enable pgmq extension
- `POST /api/ingest` route handler → insert `health_record(pending)` + enqueue pgmq job
- Signed-URL document viewer + **403-without-auth test** (M1 storage gate)
- `packages/db` generated Supabase types (add once `0004` is applied to remote)
- `0003_harden_function_grants.sql` prod push (operator task; no feature blocker)

---

## Verification at Completion

- `pnpm --filter web build` → green; 7 routes; zero TypeScript errors.
- RLS isolation test harness locally green — family-B cannot read or write family-A's rows; `app_lock_hash` positive/negative boundary verified.
- No PHI fields (`display_name`, `dob`, `allergies`, PIN, hash) appear in any `console.log`, `console.error`, or Sentry capture in the added code.
- All form and profile strings go through `useT()` / `t(locale, key)` — no hardcoded UI text in new components.
