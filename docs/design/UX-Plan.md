# UI/UX Plan

> Mobile-first, vernacular, trust-forward. Built with Tailwind + shadcn/ui (`packages/ui`). Two personas drive every screen: **Priya** (busy multitasking caregiver, one-handed phone use) and **Ramesh/elder** (large-font, low-confidence, often operated *for* them). Design target ≈ 360–414px width first; desktop is a widened version of the same layout.

---

## 1. Design principles (from README §7)
1. **One-tap capture** is the center of gravity — a persistent **+ Add** is reachable from everywhere.
2. **Show the original document instantly**; AI data layers on when ready (never block the user on AI).
3. **Plain language over medical jargon**; show "slightly high," not just "7.8%".
4. **Trust cues everywhere**: lock icons, "only you can see this," visible expiry on shares.
5. **Elder mode** is a theme (≥1.3× type, higher contrast, fewer elements, bigger tap targets ≥48px), not a separate app.
6. **Vernacular**: every string via i18n; en + hi at launch.

---

## 2. Screen hierarchy
```
Auth
 └─ Login (phone → OTP)
App shell (bottom tab nav, mobile)  [Home · Members · + Add · Reminders · More]
 ├─ Home / Family switcher
 ├─ Member
 │   ├─ Profile (vitals, allergies, conditions, emergency)
 │   ├─ Timeline (default member view)
 │   ├─ Trends
 │   └─ Medicines
 ├─ Add record (capture sheet)
 ├─ Record detail (+ Review card)
 ├─ Reminders
 ├─ Ask (AI Q&A) [Should]
 ├─ Share & Consent
 │   ├─ Create share
 │   └─ Consent dashboard (active shares + access log)
 └─ More / Settings (language, elder mode, app-lock, export, delete)
Public (no auth)
 └─ /s/:token  Doctor share view
```
**Navigation:** bottom tab bar on mobile (5 items, **+ Add** is the elevated center FAB); collapsible left rail on desktop. Member context is held in a top switcher chip so actions always apply to the right person.

---

## 3. Key wireframes (descriptions)

**Home / Family switcher**
```
┌──────────────────────────────┐
│ SehatVault            ⚙︎ 🔔   │
│ Your family                  │
│ ┌──────────┐ ┌──────────┐    │
│ │ 👴 Papa  │ │ 🧒 Aarav │    │  ← member cards: name, age,
│ │ BP・Sugar│ │ Vaccines │    │     1-line health glance,
│ │ ⚠ HbA1c↑ │ │ ✓ up todt│    │     status chip
│ └──────────┘ └──────────┘    │
│ ┌──────────┐ + Add member    │
│ │ 🙂 You   │                 │
│ └──────────┘                 │
│ [ Home ][Members]( + )[Rem][⋯]│
└──────────────────────────────┘
```

**Member → Timeline (default)**
```
┌──────────────────────────────┐
│ ‹ Papa  ▾      [Timeline|Trends|Meds]
│ 🔎 filter: All ▾   Type ▾     │
│ ── Jun 2026 ───────────────── │
│ 🧪 Lab report · 18 Jun        │
│    HbA1c 7.8% (slightly high) │
│ 💊 Prescription · 18 Jun      │
│    Metformin 500mg ×2/day     │
│ ── Jan 2026 ───────────────── │
│ 🧪 Lab report · 10 Jan …      │
│                       ( + )    │
└──────────────────────────────┘
```

**Add record (capture sheet)** — slides up from + : big **Camera**, **Gallery**, **PDF** buttons; "Who is this for?" member chips; optional type. After pick → instant upload + a processing card appears in the timeline.

**Record detail + Review card**
```
┌──────────────────────────────┐
│ ‹ Lab report · 18 Jun     ⋮  │
│ [ original document image ]   │
│ ── Extracted ───────  ✎ Edit │
│ HbA1c     7.8 %   ⚠ high      │
│ FBS       past 6m chart ↗     │
│ ⚠ 2 fields need review →      │  ← only if low confidence
│ "Not medical advice. Verify   │
│  with your doctor."           │
└──────────────────────────────┘
```

**Create share**
```
Member: Papa ▾
Include: [✓ Lab reports] [✓ Prescriptions] [ ] Scans
Dates:   [ Last 6 months ▾ ]
Docs:    (•) Include images   ( ) Summary only
Expires: [ 24 hours ▾ ]
        →  [ Generate secure link ]
Result:  QR  +  app.sehatvault.in/s/Hh…   ⧗ expires in 24h  ⎘ Copy
```

**Doctor share view (`/s/:token`, public)** — clean, read-only, no app chrome: member name + age + blood group + allergies banner; key trends; meds; record list with view buttons; footer "Shared securely via SehatVault · expires <when> · access logged."

---

## 4. Core user flows (happy path)
- **Onboard (≤90s):** Login → OTP → "Add yourself" (name, optional DOB) → "Add your first report" (camera) → processing card → organised record on timeline. *Aha.*
- **Add via camera:** + → Camera → snap → choose member → upload → timeline shows "Reading your report…" → resolves to structured card.
- **Share with doctor:** Member → Share → pick scope + expiry → QR on screen → doctor scans.
- **Reminder:** notification → "Metformin 500mg now" → [Taken] / [Skip] → logged.
- **Revoke:** More → Consent → tap a share → Revoke → instantly dead.
- **Export/Delete:** Settings → Export (email/download archive) / Delete (type DELETE → confirm).

---

## 5. State design (every screen specifies these)
**Loading**
- Skeletons for lists/cards (not spinners) to preserve layout.
- AI processing = a **named progress card** ("Reading your report — usually ~20s") with the original thumbnail visible; never a blocking modal.
- Optimistic UI for capture (record appears immediately as `pending`).

**Empty**
- Home (no members): friendly illustration + "Add your first family member."
- Timeline (no records): "No records yet — tap + to add your first report" with a sample.
- Trends (insufficient data): "Add 2+ lab reports to see a trend line."
- Reminders (none): "No reminders. We'll remind you about medicines automatically when you add a prescription."

**Error**
- Upload failed (network): inline retry on the card; queued, never lost.
- Extraction failed: record still viewable (original doc) + "Couldn't read this automatically — [Enter details] / [Try again]."
- OTP error: clear, non-technical ("That code didn't match. Resend?").
- Offline: a top banner "You're offline — we'll sync when you're back"; reads from cache where possible.
- Share expired (doctor side): a calm "This link has expired. Ask the family to share again."
- Permission/forbidden: never a raw 403 — "You don't have access to this."

---

## 6. Elder mode (ADR-015)
- Toggle in Settings (and offered during onboarding if user age suggests it).
- ≥1.3× base type, AA+ contrast, single-column, ≥48px targets, icon+label (never icon-only), reduced motion, optional read-aloud of summaries (later).
- Same routes/components, themed — no separate codebase.

---

## 7. Accessibility & vernacular
- WCAG AA: labels on all controls, focus order, contrast tokens in `packages/ui`.
- All copy through `t()`; Hindi reviewed by a native speaker; numerals/units local/medical-correct.
- Tap targets, one-handed reachability (primary actions in the thumb zone / bottom sheet).

---

## 8. Component inventory (shadcn/ui base) — build order maps to sprints
MemberCard · CaptureSheet · RecordCard · ReviewCard · TrendChart (Recharts) · MedItem · ReminderItem · ShareScopeForm · QRCard · ConsentRow · AccessLogRow · EmptyState · ProcessingCard · LanguageToggle · ElderModeProvider · AppLockGate.
