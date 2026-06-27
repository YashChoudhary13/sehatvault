> **SUPERSEDED & IMPLEMENTED** — see `docs/superpowers/specs/2026-06-26-design-overhaul-design.md` (approved spec) and `docs/superpowers/plans/2026-06-26-design-overhaul.md` (executed plan). Calm Indigo overhaul shipped on branch `feat/design-overhaul`; Task 9 hero video/poster assets deferred (HeroMedia component exists, ready to wire).

# SehatVault — UI/Design Overhaul (Direction & Plan)

> **Status:** DIRECTION DOC — not yet an approved spec. Captured **2026-06-26** at the user's request as the **FIRST task for next session**.
> **Next step:** run the `superpowers:brainstorming` flow (decide the open questions below, one at a time) → write the approved spec under `docs/superpowers/specs/` → `writing-plans` → implement surface-by-surface.
> **HARD GATE:** do **not** start implementation before the *Surface focus* + *Design language* decisions below are made and approved. M1 (Manual Vault) is already complete on branch `feat/m1-manual-vault`; this work sits on top of it.

---

## 1. Why we're doing this
The current UI is clean but **static and utilitarian** — competent tokens, but it reads "safe government portal," not "premium product from a great, well-resourced team." Goal: make SehatVault feel **professional, welcoming, alive, and trustworthy** — the kind of craft you see from Linear/Stripe/Arc — by introducing tasteful **motion (Framer Motion)**, select **3D rendering**, and **video** (including **Higgsfield-generated** assets), plus added functionality.

## 2. The north-star tension (the whole design problem)
Level up the *feel* WITHOUT betraying the product's real constraints:
- **Users:** "Priya" on a **mid-range Android**; "Arjun" (NRI). **Elder mode** (large type / high contrast).
- **India context:** data costs + low-end devices → a strict **performance/asset budget**.
- **Brand:** privacy-first, **calm**, trustworthy (it's health data) → **premium-restrained, never flashy-anxious**.
- **Accessibility:** WCAG, `prefers-reduced-motion`, status = icon+label (never colour-only).

**Design principle: "Premium and calm, not loud."** Every motion / 3D / video element MUST have a graceful reduced-motion + low-bandwidth fallback and must never delay content.

## 3. Reference bar (the feeling we want)
Linear (motion restraint), Stripe (trust + polish), Arc / Vercel (craft), **Whoop / Oura / Apple Health** (health data made beautiful *and* calm). Premium-SaaS + health-adjacent — **not** consumer-flashy.

## 4. Open decisions to make FIRST (brainstorm, one at a time)
1. **Surface focus** — which first?
   - (a) **Marketing landing** — public first impression; safest place for bold motion / 3D hero / video / Higgsfield art; no daily-use/elder constraint.
   - (b) **In-app product** (`/home`, `/records`, `/members`) — daily use; higher real-user payoff but motion/3D must stay calm + fast + elder-friendly.
   - (c) **Both as one system** — most ambitious.
   - (d) **Design-language-first showcase** — build the elevated system on one preview route, then roll out. *(Lead's lean: **d → a → b**.)*
2. **How far to push 3D** — signature hero motif only / 3D woven throughout / none-but-rich-2D-motion.
3. **Video usage** — hero background loop / explainer / none; and how to keep it cheap.
4. **Higgsfield assets** — what to generate (hero imagery, product-shot loops, abstract motifs) + the pipeline to bring them in (formats, optimization, storage).
5. **"More functionality"** — a **separate track**; enumerate + prioritize (e.g., richer `/home` dashboard, lab-value **trend charts** [ties to M2], global search, quick-capture FAB flow, doctor-share). Needs its own scoping pass — do **not** fold into the visual overhaul.

## 5. Tech direction (proposed — confirm in brainstorm)
- **Motion:** Framer Motion (`motion/react`) across landing + app. **Motion tiers** (calm / standard / expressive) keyed to context + `prefers-reduced-motion` + elder mode. Use for route/page transitions, scroll-reveal (we already have `Reveal`), micro-interactions, layout animations.
- **3D:** React Three Fiber + drei *or* Spline (designer-friendly) for **one signature motif** (e.g., an abstract "calm vault" / timeline object on the hero). **Lazy-loaded, paused off-screen, static poster fallback**, strict poly/texture budget, never on the critical render path.
- **Video:** lazy + IntersectionObserver, poster image, muted/loop, `prefers-reduced-motion` → poster only; consider skipping video on slow connections (Network Information API hint).
- **Assets / Higgsfield:** generate hero visuals + short loops; optimize to AVIF/WebP + compressed mp4/webm; store under `public/` or a CDN; keep total landing weight within budget.
- **Design system:** extend `packages/config/theme.css` (Warm Trust) with richer **elevation/depth, gradient/mesh accents, a refined type scale + display font, motion tokens**; evaluate a **dark mode**.
- **Components to elevate:** cards, nav, buttons, empty states, and **data-viz** (lab trend charts — connects to M2).

## 6. Per-surface idea seeds (refine in brainstorm)
- **Landing:** cinematic hero (3D/video motif + Higgsfield art); scroll-driven storytelling; an animated **"paper pile → calm timeline"** transformation; trust/social-proof band; refined pricing; motion on the device mockup.
- **In-app:** calm page transitions; polished skeletons; quiet-but-delightful empty states; animated timeline + filter transitions; **trend-chart** visualizations; a richer `/home` dashboard.

## 7. Suggested first-session flow
1. Brainstorm → lock decisions §4.1–4.4 (+ scope §4.5 separately).
2. Write the approved spec → `docs/superpowers/specs/YYYY-MM-DD-design-overhaul-design.md`.
3. Build a **design-language showcase** on one route (e.g. `/design-preview`) proving motion + 3D + elevated components; review via agent-browser (desktop + 390px).
4. `writing-plans` → implement surface-by-surface, each pixel-verified, each respecting reduced-motion / elder / performance budget.

## 8. Guardrails (non-negotiable during the overhaul)
- Every animation / 3D / video: reduced-motion + low-bandwidth fallback; **never blocks content**.
- Keep `typecheck` / `build` / `test` green; pixel-verify each surface (desktop + 390px mobile).
- Don't regress accessibility, elder mode, or the privacy-calm tone.
- Set a **performance budget** (e.g., LCP target + landing asset-weight cap) *before* adding heavy assets.

---

## Relevant skills/tools to pull in next session
`superpowers:brainstorming` (start here) → `high-end-visual-design` / `design-taste-frontend` / `ui-ux-pro-max` / `emil-design-eng` (taste), `framer` + `framer-code-components` + `ecc:motion-*` (motion), `imagegen-frontend-web` / `god-tibo-imagen` / Higgsfield (assets), `superpowers:writing-plans` (to plan the build).
