# Design Overhaul (Calm Indigo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin SehatVault from a static "government-portal" look to a premium, calm, alive product (Calm Indigo palette + motion tiers + Higgsfield hero) across landing + in-app, built on a shared `packages/ui` foundation.

**Architecture:** Foundation-first (spec Approach A). Build a shared design layer — extended `theme.css` tokens + a new `@sehatvault/ui` workspace holding Framer-Motion primitives and elevated components — proven on a hidden `/design-preview` route, then refactor the marketing landing and the in-app surfaces onto it. No 3D, no new DB schema; presentation layer only.

**Tech Stack:** Next.js 15 (App Router, RSC), Tailwind v4 (`@theme` tokens in `packages/config/theme.css`), `motion` (Framer Motion `motion/react`), `next/font/google` (Bricolage Grotesque display), TypeScript strict, Vitest, pnpm workspaces, agent-browser for pixel verification.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-06-26-design-overhaul-design.md` — authoritative.
- **Tokens only:** all colour/spacing/duration from `packages/config/theme.css`. No hardcoded hex, no raw `ms` durations in components.
- **Palette = Calm Indigo:** `--color-primary #4F46E5`, `--color-primary-ink #312E81`, `--color-accent #14B8A6`, `--color-bg #FBFBFE`, `--color-surface #FFFFFF`, `--color-tint #EEF2FF`, `--color-ink #0F1729`, `--color-muted #64748B`, `--color-border #E5E7EB`, `--color-success #059669`, `--color-warn #D97706`, `--color-danger #E11D48`.
- **Dark mode:** token-ready (semantic names), light values only — do not author dark values.
- **Motion:** 3 tiers (calm / standard / expressive). Every motion degrades under `prefers-reduced-motion` AND elder mode to near-instant fade / no transform. Motion never blocks content (carry the 1200ms `Reveal` safety-net pattern).
- **No 3D libraries** in the bundle. No new DB tables / RLS — dashboard uses existing data + endpoints only.
- **Icons:** Lucide only (never emoji). Status = icon + label, never colour alone.
- **i18n:** all user copy via `t()` (en + hi). Landing copy must move from inline English into `t()`.
- **Responsive:** 375 / 768 / 1024 / 1440, no horizontal scroll on mobile.
- **Per-surface DoD + agent-browser pixel-verify** (desktop + 390px) before a surface is "done". `main` stays deployable; `/design-preview` never ships to real users.
- **Dependency direction:** `apps/web` → `@sehatvault/ui` → `@sehatvault/config`. `packages/core` stays framework-free (no React/motion there).
- **Commits:** Conventional Commits; end body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

# PHASE 0 — Foundation

### Task 1: Scaffold the `@sehatvault/ui` workspace + install motion

**Files:**
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`
- Create: `packages/ui/src/index.ts`
- Modify: `apps/web/package.json` (add deps)
- Modify: `apps/web/next.config.ts` (transpilePackages)
- Modify: `apps/web/src/app/globals.css` (Tailwind `@source` for packages/ui)

**Interfaces:**
- Produces: importable package `@sehatvault/ui` (source-`main`, transpiled by Next), with `motion` available to its components.

- [ ] **Step 1: Create the package manifest**

`packages/ui/package.json`:
```json
{
  "name": "@sehatvault/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./motion": "./src/motion/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@sehatvault/config": "workspace:*",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.2"
  },
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "motion": "^11.15.0"
  }
}
```

- [ ] **Step 2: Create the package tsconfig**

`packages/ui/tsconfig.json`:
```json
{
  "extends": "@sehatvault/config/tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create a placeholder barrel so the package resolves**

`packages/ui/src/index.ts`:
```ts
export {};
```

- [ ] **Step 4: Wire web to consume it + install motion**

In `apps/web/package.json`, add to `dependencies` (alphabetical with the other `@sehatvault/*`):
```json
"@sehatvault/ui": "workspace:*",
"motion": "^11.15.0",
```

In `apps/web/next.config.ts`, extend transpilePackages:
```ts
transpilePackages: ["@sehatvault/core", "@sehatvault/i18n", "@sehatvault/ui"],
```

- [ ] **Step 5: Make Tailwind v4 scan packages/ui for classes**

In `apps/web/src/app/globals.css`, directly after the existing two imports (line 2), add:
```css
@source "../../../../packages/ui/src/**/*.{ts,tsx}";
```

- [ ] **Step 6: Install and verify the workspace resolves**

Run: `pnpm install`
Expected: completes; `@sehatvault/ui` and `motion` appear in `apps/web` node_modules.

Run: `pnpm --filter web typecheck`
Expected: PASS (no errors; package import graph resolves).

- [ ] **Step 7: Commit**

```bash
git add packages/ui apps/web/package.json apps/web/next.config.ts apps/web/src/app/globals.css pnpm-lock.yaml
git commit -m "chore(ui): scaffold @sehatvault/ui workspace + add motion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Calm Indigo tokens + elevation / gradient / motion tokens

**Files:**
- Modify: `packages/config/theme.css` (whole file)

**Interfaces:**
- Produces: CSS custom properties consumed by every surface — colours above, plus `--elev-0..4`, `--mesh-hero`, `--mesh-section`, `--glow-accent`, `--motion-calm`, `--motion-standard`, `--motion-expressive`, `--font-display`.

- [ ] **Step 1: Replace the palette + add new token groups**

Overwrite `packages/config/theme.css` with:
```css
@theme {
  /* Calm Indigo — semantic names (dark-ready; light values only) */
  --color-primary: #4F46E5;
  --color-primary-ink: #312E81;
  --color-accent: #14B8A6;
  --color-bg: #FBFBFE;
  --color-surface: #FFFFFF;
  --color-tint: #EEF2FF;
  --color-ink: #0F1729;
  --color-muted: #64748B;
  --color-border: #E5E7EB;
  --color-success: #059669;
  --color-warn: #D97706;
  --color-danger: #E11D48;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Display font (wired via next/font in Task 3) */
  --font-display: var(--font-bricolage), "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
}

:root {
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  /* Elevation ladder — soft, layered, never heavy */
  --elev-0: none;
  --elev-1: 0 1px 2px rgba(15, 23, 41, 0.04), 0 1px 1px rgba(15, 23, 41, 0.03);
  --elev-2: 0 2px 8px rgba(15, 23, 41, 0.06), 0 1px 2px rgba(15, 23, 41, 0.04);
  --elev-3: 0 8px 24px rgba(15, 23, 41, 0.08), 0 2px 6px rgba(15, 23, 41, 0.05);
  --elev-4: 0 16px 48px rgba(15, 23, 41, 0.12), 0 4px 12px rgba(15, 23, 41, 0.06);

  /* Gradient / mesh — the no-3D depth source */
  --mesh-hero: radial-gradient(120% 120% at 15% 10%, #EEF2FF 0%, #FBFBFE 45%, #FFFFFF 100%);
  --mesh-section: linear-gradient(180deg, #FBFBFE 0%, #EEF2FF 100%);
  --glow-accent: radial-gradient(60% 60% at 50% 0%, rgba(79, 70, 229, 0.10) 0%, rgba(79, 70, 229, 0) 70%);

  /* Motion tokens (duration only; tier logic in packages/ui/motion) */
  --motion-calm: 200ms;
  --motion-standard: 360ms;
  --motion-expressive: 600ms;
}
```

- [ ] **Step 2: Verify the app builds with the new tokens**

Run: `pnpm --filter web build`
Expected: PASS. (Visual regressions are fixed in later tasks; this only confirms tokens resolve and nothing imports a removed token name.)

- [ ] **Step 3: Confirm no code referenced a now-removed token literally**

Run: `grep -rn "0F766E\|F59E0B\|FAFAF7\|Warm Trust\|warm-trust" apps/web/src packages | grep -vi "Design-Overhaul\|specs/\|plans/"`
Expected: no matches in code (matches only in docs are fine; if a component hardcoded the old hex, replace it with the token in that component as part of this step).

- [ ] **Step 4: Commit**

```bash
git add packages/config/theme.css
git commit -m "feat(theme): Calm Indigo palette + elevation/gradient/motion tokens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Wire the Bricolage Grotesque display font

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Consumes: `--font-display` token (declared in Task 2, references `--font-bricolage`).
- Produces: `--font-bricolage` CSS var on `<html>` so headings can use `font-[family-name:var(--font-display)]`.

- [ ] **Step 1: Load the font via next/font and expose its CSS variable**

In `apps/web/src/app/layout.tsx`, add the import near the existing font import:
```ts
import { Bricolage_Grotesque } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-bricolage",
  display: "swap",
});
```

Add `bricolage.variable` to the existing `<html>` (or `<body>`) `className` alongside the current font variable, e.g.:
```tsx
<html lang={locale} className={`${bricolage.variable}`}>
```
(Preserve any existing classes/variables already on that element — append, don't replace.)

- [ ] **Step 2: Verify build + that the variable is emitted**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(theme): wire Bricolage Grotesque display font

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Motion primitives — tier hook + MotionTier + PageTransition + Reveal

**Files:**
- Create: `packages/ui/src/motion/use-motion-tier.ts`
- Create: `packages/ui/src/motion/use-motion-tier.test.ts`
- Create: `packages/ui/src/motion/motion-tier.tsx`
- Create: `packages/ui/src/motion/reveal.tsx`
- Create: `packages/ui/src/motion/page-transition.tsx`
- Create: `packages/ui/src/motion/index.ts`
- Modify: `packages/ui/package.json` (add vitest)

**Interfaces:**
- Produces:
  - `type MotionTier = "calm" | "standard" | "expressive"`
  - `resolveMotion(tier: MotionTier, reduced: boolean): MotionSpec`
  - `useMotionTier(tier: MotionTier): MotionSpec` (reads `prefers-reduced-motion` + elder mode)
  - `<MotionTierBox tier as children />` (the component is named `MotionTier` in its file, exported as `MotionTierBox`), `<Reveal delay? className? children />`, `<PageTransition children />`

- [ ] **Step 1: Add vitest to the ui package**

In `packages/ui/package.json` `devDependencies`, add `"vitest": "^2.1.8"`, and to `scripts` add `"test": "vitest run"`. Run `pnpm install`.

- [ ] **Step 2: Write the failing test for the pure resolver**

`packages/ui/src/motion/use-motion-tier.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { resolveMotion } from "./use-motion-tier";

describe("resolveMotion", () => {
  it("calm tier uses the calm duration and a small fade-rise", () => {
    const m = resolveMotion("calm", false);
    expect(m.initial).toEqual({ opacity: 0, y: 4 });
    expect(m.animate).toEqual({ opacity: 1, y: 0 });
    expect(m.transition.duration).toBeCloseTo(0.2);
  });

  it("expressive tier rises further and lasts longer", () => {
    const m = resolveMotion("expressive", false);
    expect(m.initial).toEqual({ opacity: 0, y: 24 });
    expect(m.transition.duration).toBeCloseTo(0.6);
  });

  it("reduced motion collapses every tier to an instant opacity fade, no transform", () => {
    const m = resolveMotion("expressive", true);
    expect(m.initial).toEqual({ opacity: 0 });
    expect(m.animate).toEqual({ opacity: 1 });
    expect(m.transition.duration).toBeCloseTo(0.01);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `pnpm --filter @sehatvault/ui test`
Expected: FAIL — "resolveMotion is not a function".

- [ ] **Step 4: Implement the resolver + hook**

`packages/ui/src/motion/use-motion-tier.ts`:
```ts
"use client";

import { useEffect, useState } from "react";

export type MotionTier = "calm" | "standard" | "expressive";

const RISE: Record<MotionTier, number> = { calm: 4, standard: 12, expressive: 24 };
const DURATION_S: Record<MotionTier, number> = { calm: 0.2, standard: 0.36, expressive: 0.6 };

export interface MotionSpec {
  initial: Record<string, number>;
  animate: Record<string, number>;
  transition: { duration: number; ease: number[] };
}

const EASE_OUT = [0.23, 1, 0.32, 1];

export function resolveMotion(tier: MotionTier, reduced: boolean): MotionSpec {
  if (reduced) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.01, ease: EASE_OUT } };
  }
  return {
    initial: { opacity: 0, y: RISE[tier] },
    animate: { opacity: 1, y: 0 },
    transition: { duration: DURATION_S[tier], ease: EASE_OUT },
  };
}

/** Elder mode is signalled by data-elder="true" on <html> (set by ElderModeProvider, M3). */
function prefersReduced(): boolean {
  if (typeof window === "undefined") return true;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const elder = document.documentElement.dataset.elder === "true";
  return mq || elder;
}

export function useMotionTier(tier: MotionTier): MotionSpec {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    setReduced(prefersReduced());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(prefersReduced());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return resolveMotion(tier, reduced);
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `pnpm --filter @sehatvault/ui test`
Expected: PASS (3 tests).

- [ ] **Step 6: Implement the components**

`packages/ui/src/motion/motion-tier.tsx`:
```tsx
"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionTier, type MotionTier as Tier } from "./use-motion-tier";

export function MotionTier({
  tier,
  children,
  className,
}: {
  tier: Tier;
  children: ReactNode;
  className?: string;
}) {
  const m = useMotionTier(tier);
  return (
    <motion.div className={className} initial={m.initial} animate={m.animate} transition={m.transition}>
      {children}
    </motion.div>
  );
}
```

`packages/ui/src/motion/reveal.tsx` (port of the existing landing Reveal — IntersectionObserver + 1200ms safety net, now token-driven duration):
```tsx
"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    const fallback = window.setTimeout(() => setShown(true), 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(16px)",
        transition: "opacity var(--motion-standard) var(--ease-out), transform var(--motion-standard) var(--ease-out)",
        transitionDelay: shown ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}
```

`packages/ui/src/motion/page-transition.tsx`:
```tsx
"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { useMotionTier } from "./use-motion-tier";

export function PageTransition({ children }: { children: ReactNode }) {
  const m = useMotionTier("calm");
  return (
    <motion.div initial={m.initial} animate={m.animate} transition={m.transition}>
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 7: Barrel the motion exports**

`packages/ui/src/motion/index.ts`:
```ts
export { resolveMotion, useMotionTier } from "./use-motion-tier";
export type { MotionTier, MotionSpec } from "./use-motion-tier";
export { MotionTier as MotionTierBox } from "./motion-tier";
export { Reveal } from "./reveal";
export { PageTransition } from "./page-transition";
```

- [ ] **Step 8: Typecheck + test the package**

Run: `pnpm --filter @sehatvault/ui typecheck && pnpm --filter @sehatvault/ui test`
Expected: both PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): motion primitives — tier resolver, MotionTier, Reveal, PageTransition

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: HeroMedia primitive (poster → lazy loop, slow-conn + reduced-motion safe)

**Files:**
- Create: `packages/ui/src/primitives/should-play-media.ts`
- Create: `packages/ui/src/primitives/should-play-media.test.ts`
- Create: `packages/ui/src/primitives/hero-media.tsx`

**Interfaces:**
- Produces:
  - `shouldPlayMedia(opts: { reducedMotion: boolean; effectiveType?: string; saveData?: boolean }): boolean`
  - `<HeroMedia poster src srcWebm? className alt />` — renders the poster as the LCP element; mounts the loop only when allowed and in view.

- [ ] **Step 1: Write the failing test for the gating function**

`packages/ui/src/primitives/should-play-media.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { shouldPlayMedia } from "./should-play-media";

describe("shouldPlayMedia", () => {
  it("plays on a fast connection with motion allowed", () => {
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "4g", saveData: false })).toBe(true);
  });
  it("never plays when reduced motion is requested", () => {
    expect(shouldPlayMedia({ reducedMotion: true, effectiveType: "4g" })).toBe(false);
  });
  it("never plays when Save-Data is on", () => {
    expect(shouldPlayMedia({ reducedMotion: false, saveData: true })).toBe(false);
  });
  it("does not play on slow connections (2g/3g)", () => {
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "3g" })).toBe(false);
    expect(shouldPlayMedia({ reducedMotion: false, effectiveType: "2g" })).toBe(false);
  });
  it("plays when connection info is unavailable and motion is allowed", () => {
    expect(shouldPlayMedia({ reducedMotion: false })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm --filter @sehatvault/ui test should-play-media`
Expected: FAIL — "shouldPlayMedia is not a function".

- [ ] **Step 3: Implement the gate**

`packages/ui/src/primitives/should-play-media.ts`:
```ts
export interface MediaGateOpts {
  reducedMotion: boolean;
  effectiveType?: string;
  saveData?: boolean;
}

export function shouldPlayMedia({ reducedMotion, effectiveType, saveData }: MediaGateOpts): boolean {
  if (reducedMotion) return false;
  if (saveData) return false;
  if (effectiveType && (effectiveType === "2g" || effectiveType === "slow-2g" || effectiveType === "3g")) {
    return false;
  }
  return true;
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm --filter @sehatvault/ui test should-play-media`
Expected: PASS (5 assertions).

- [ ] **Step 5: Implement HeroMedia**

`packages/ui/src/primitives/hero-media.tsx`:
```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { shouldPlayMedia } from "./should-play-media";

interface HeroMediaProps {
  poster: string;
  src: string;       // mp4
  srcWebm?: string;  // optional webm (preferred)
  className?: string;
  alt: string;
}

export function HeroMedia({ poster, src, srcWebm, className, alt }: HeroMediaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // navigator.connection is non-standard; read defensively.
    const conn = (navigator as unknown as { connection?: { effectiveType?: string; saveData?: boolean } }).connection;
    if (!shouldPlayMedia({ reducedMotion: reduced, effectiveType: conn?.effectiveType, saveData: conn?.saveData })) {
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setPlay(true);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {play ? (
        <video autoPlay muted loop playsInline poster={poster} aria-label={alt} className="h-full w-full object-cover">
          {srcWebm ? <source src={srcWebm} type="video/webm" /> : null}
          <source src={src} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt={alt} className="h-full w-full object-cover" />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + test**

Run: `pnpm --filter @sehatvault/ui typecheck && pnpm --filter @sehatvault/ui test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/primitives
git commit -m "feat(ui): HeroMedia (poster->lazy loop) + slow-conn/reduced-motion gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Elevated component primitives (Card, Button, EmptyState, Section, GradientField)

**Files:**
- Create: `packages/ui/src/primitives/card.tsx`
- Create: `packages/ui/src/primitives/button.tsx`
- Create: `packages/ui/src/primitives/empty-state.tsx`
- Create: `packages/ui/src/primitives/section.tsx`
- Create: `packages/ui/src/primitives/gradient-field.tsx`
- Create: `packages/ui/src/primitives/cn.ts`
- Create: `packages/ui/src/primitives/index.ts`
- Modify: `packages/ui/src/index.ts`
- Modify: `packages/ui/package.json` (add clsx + tailwind-merge)

**Interfaces:**
- Consumes: motion primitives (Task 4), tokens (Task 2).
- Produces (all token-based, elevation-aware):
  - `<Card elevation? interactive? className children />` (elevation 1–4, hover-lift when `interactive`)
  - `<Button variant? size? className ...buttonProps />` (variants: `primary | secondary | ghost | danger`; sizes `sm | md | lg`)
  - `<EmptyState icon title description? action? intent? />` (intent: `default | error`)
  - `<Section tint? className children />`
  - `<GradientField variant? className />` (variant: `hero | section | glow`)
  - `cn(...inputs)`

- [ ] **Step 1: Add class utilities to the package**

In `packages/ui/package.json` `dependencies`, add `"clsx": "^2.1.1"` and `"tailwind-merge": "^2.6.0"`. Run `pnpm install`.

`packages/ui/src/primitives/cn.ts`:
```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: GradientField (the no-3D depth source)**

`packages/ui/src/primitives/gradient-field.tsx`:
```tsx
import { cn } from "./cn";

const FIELD: Record<"hero" | "section" | "glow", string> = {
  hero: "[background:var(--mesh-hero)]",
  section: "[background:var(--mesh-section)]",
  glow: "[background:var(--glow-accent)]",
};

export function GradientField({
  variant = "section",
  className,
}: {
  variant?: "hero" | "section" | "glow";
  className?: string;
}) {
  return <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10", FIELD[variant], className)} />;
}
```

- [ ] **Step 3: Card with elevation ladder + hover lift**

`packages/ui/src/primitives/card.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "./cn";

const ELEV: Record<1 | 2 | 3 | 4, string> = {
  1: "[box-shadow:var(--elev-1)]",
  2: "[box-shadow:var(--elev-2)]",
  3: "[box-shadow:var(--elev-3)]",
  4: "[box-shadow:var(--elev-4)]",
};

export function Card({
  elevation = 1,
  interactive = false,
  className,
  children,
}: {
  elevation?: 1 | 2 | 3 | 4;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]",
        ELEV[elevation],
        interactive &&
          "transition-[transform,box-shadow] duration-[var(--motion-standard)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:[box-shadow:var(--elev-3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Button with press micro-interaction**

`packages/ui/src/primitives/button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-ink)]",
  secondary: "bg-[var(--color-tint)] text-[var(--color-primary-ink)] hover:bg-[var(--color-border)]",
  ghost: "bg-transparent text-[var(--color-ink)] hover:bg-[var(--color-tint)]",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
};
const SIZE: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium",
        "transition-[transform,background-color,opacity] duration-[var(--motion-calm)] ease-[var(--ease-out)]",
        "active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: Section + EmptyState**

`packages/ui/src/primitives/section.tsx`:
```tsx
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Section({
  tint = false,
  className,
  children,
}: {
  tint?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("relative", tint && "bg-[var(--color-tint)]", className)}>{children}</section>
  );
}
```

`packages/ui/src/primitives/empty-state.tsx`:
```tsx
import type { ComponentType, ReactNode } from "react";
import { cn } from "./cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  intent = "default",
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  intent?: "default" | "error";
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full",
          intent === "error" ? "bg-[var(--color-danger)]/10" : "bg-[var(--color-tint)]",
        )}
      >
        <Icon className={cn("h-6 w-6", intent === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-primary)]")} />
      </span>
      <h3 className="font-[family-name:var(--font-display)] text-lg text-[var(--color-ink)]">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-[var(--color-muted)]">{description}</p> : null}
      {action}
    </div>
  );
}
```

- [ ] **Step 6: Barrels**

`packages/ui/src/primitives/index.ts`:
```ts
export { cn } from "./cn";
export { Card } from "./card";
export { Button } from "./button";
export { EmptyState } from "./empty-state";
export { Section } from "./section";
export { GradientField } from "./gradient-field";
export { HeroMedia } from "./hero-media";
export { shouldPlayMedia } from "./should-play-media";
```

`packages/ui/src/index.ts` (replace placeholder):
```ts
export * from "./primitives";
export * from "./motion";
```

- [ ] **Step 7: Typecheck the package**

Run: `pnpm --filter @sehatvault/ui typecheck`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add packages/ui
git commit -m "feat(ui): elevated primitives — Card, Button, EmptyState, Section, GradientField

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Hidden `/design-preview` showcase + production gate

**Files:**
- Create: `apps/web/src/app/(dev)/design-preview/page.tsx`
- Modify: `apps/web/src/middleware.ts` (block in production)

**Interfaces:**
- Consumes: all of `@sehatvault/ui`.
- Produces: a dev-only route rendering every primitive + each motion tier for pixel review.

- [ ] **Step 1: Build the showcase page**

`apps/web/src/app/(dev)/design-preview/page.tsx`:
```tsx
import { Activity, FileText, Plus } from "lucide-react";
import { Button, Card, EmptyState, GradientField, Section } from "@sehatvault/ui";
import { MotionTierBox, Reveal } from "@sehatvault/ui/motion";

export default function DesignPreviewPage() {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-ink)]">
      <Section className="relative overflow-hidden px-6 py-20">
        <GradientField variant="hero" />
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">Calm Indigo — design preview</h1>
        <p className="mt-3 max-w-lg text-[var(--color-muted)]">Elevation, gradient depth, motion tiers, and primitives.</p>
      </Section>

      <Section className="px-6 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([1, 2, 3, 4] as const).map((e) => (
            <Card key={e} elevation={e} interactive className="p-5">
              <p className="text-sm text-[var(--color-muted)]">Elevation {e}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-lg">Card</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section tint className="px-6 py-12">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary"><Plus className="h-4 w-4" /> With icon</Button>
        </div>
      </Section>

      <Section className="space-y-8 px-6 py-12">
        {(["calm", "standard", "expressive"] as const).map((tier) => (
          <MotionTierBox key={tier} tier={tier}>
            <Card className="p-5">
              <p className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4 text-[var(--color-primary)]" /> Motion tier: {tier}</p>
            </Card>
          </MotionTierBox>
        ))}
        <Reveal>
          <Card className="p-5"><p className="text-sm">Reveal on scroll (standard tier)</p></Card>
        </Reveal>
      </Section>

      <Section className="px-6 py-12">
        <EmptyState icon={FileText} title="No records yet" description="Add your first document to start the timeline." action={<Button>Add record</Button>} />
      </Section>
    </main>
  );
}
```

- [ ] **Step 2: Gate the route out of production**

In `apps/web/src/middleware.ts`, at the very top of the middleware function (before the existing auth/session logic), add:
```ts
  if (request.nextUrl.pathname.startsWith("/design-preview") && process.env.NODE_ENV === "production") {
    return NextResponse.rewrite(new URL("/404", request.url));
  }
```
(Use the file's existing `NextResponse` import; if `request` is named differently, match the existing parameter name.)

- [ ] **Step 3: Build + run dev, pixel-verify the preview**

Run: `pnpm --filter web build`
Expected: PASS.

Then with the dev server running, use agent-browser:
- `agent-browser open http://localhost:3000/design-preview`
- `agent-browser screenshot --full --screenshot-dir .`
- `agent-browser set viewport 390 844` → screenshot again
Expected: cards show graded elevation; buttons show all four variants; the three motion-tier cards animate in; reveal card fades on scroll; no horizontal scroll at 390px. Capture both screenshots for the review checkpoint.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/src/app/(dev)" apps/web/src/middleware.ts
git commit -m "feat(web): hidden /design-preview showcase + production gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> **PHASE 0 review checkpoint:** foundation is proven on `/design-preview`. Do not proceed to surfaces until the preview passes pixel review (desktop + 390px) and `pnpm --filter @sehatvault/ui test` + `pnpm --filter web build` are green.

---

# PHASE 1 — Landing

### Task 8: Refactor the marketing landing onto primitives + Calm Indigo + i18n

**Files:**
- Modify: `apps/web/src/app/(marketing)/page.tsx`
- Modify: `apps/web/src/app/(marketing)/layout.tsx`
- Delete: `apps/web/src/app/(marketing)/_components/reveal.tsx` (now in `@sehatvault/ui/motion`)
- Modify: any file importing the old local `reveal` (update import path)
- Modify: `packages/i18n/src/en.ts` and `packages/i18n/src/hi.ts` (add `marketing.*` keys)

**Interfaces:**
- Consumes: `@sehatvault/ui` primitives + motion; `t()` from `@sehatvault/i18n`.

- [ ] **Step 1: Add marketing i18n keys**

Read `packages/i18n/src/en.ts` first to match the exact export pattern. Add a `marketing` group covering every visible landing string — hero title/subtitle/CTA, problem, how-it-works steps, feature bento titles, privacy, pricing, final CTA. Mirror the same keys in the hi catalog with Hindi values; reuse the landing's existing English strings verbatim where they already exist.

- [ ] **Step 2: Repoint the Reveal import + delete the local copy**

Find usages:
Run: `grep -rn "_components/reveal" apps/web/src`
For each hit, change the import to:
```ts
import { Reveal } from "@sehatvault/ui/motion";
```
Then delete `apps/web/src/app/(marketing)/_components/reveal.tsx`.

- [ ] **Step 3: Refactor the hero + sections onto primitives**

In `apps/web/src/app/(marketing)/page.tsx`:
- Wrap the hero in a `Section` with `<GradientField variant="hero" />`. Keep the existing CSS device mockup for now (the `HeroMedia` swap happens in Task 9).
- Replace bespoke card markup with `<Card>`, bespoke buttons with `<Button>`.
- Replace all inline English with `t(locale, "marketing....")`.
- Headings use `font-[family-name:var(--font-display)]`.
- Keep section order: hero, problem, how-it-works, feature bento, privacy, pricing, final CTA.

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: PASS.

- [ ] **Step 5: Pixel-verify the landing (desktop + 390px), both locales**

With dev server running:
- `agent-browser open http://localhost:3000/` → `screenshot --full --screenshot-dir .`
- `agent-browser set viewport 390 844` → screenshot
- Toggle locale to hi → screenshot hero
Expected: Calm Indigo throughout, elevated cards, display headings, no inline English, no horizontal scroll at 390px, reveal animations fire.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(marketing\) packages/i18n
git commit -m "feat(web): landing on Calm Indigo primitives + motion + i18n

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Hero assets (Higgsfield still/loop + textures)

**Files:**
- Create: `apps/web/public/brand/hero-poster.avif` (+ `hero-poster.webp` fallback)
- Create: `apps/web/public/brand/hero-loop.webm`, `apps/web/public/brand/hero-loop.mp4`
- Create: `apps/web/public/brand/texture-mesh.webp`
- Modify: `apps/web/src/app/(marketing)/page.tsx` (use `<HeroMedia>`)
- Modify: `packages/i18n/src/en.ts` + `packages/i18n/src/hi.ts` (`marketing.hero.mediaAlt`)

**Interfaces:**
- Consumes: `HeroMedia` (Task 5).

- [ ] **Step 1: Generate + optimize assets**

Generate the hero still + one short abstract loop + a mesh texture with Higgsfield (calm, indigo-leaning, on-brand — abstract "paper pile → calm timeline" motif, NOT literal medical imagery). Optimize:
- still → AVIF + WebP, poster ≤ ~150 KB
- loop → webm (VP9) + mp4 (H.264), ≤ ~1.5 MB total, ~4–6 s, seamless
- extract the first frame as the poster so poster and loop match
Place all under `apps/web/public/brand/`.

- [ ] **Step 2: Wire HeroMedia into the hero**

In the hero `Section` of `page.tsx`:
```tsx
<HeroMedia
  poster="/brand/hero-poster.avif"
  srcWebm="/brand/hero-loop.webm"
  src="/brand/hero-loop.mp4"
  alt={t(locale, "marketing.hero.mediaAlt")}
  className="aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-xl)] [box-shadow:var(--elev-3)]"
/>
```
Add the `marketing.hero.mediaAlt` key (en + hi).

- [ ] **Step 3: Check the performance budget**

Run: `pnpm --filter web build`
Expected: PASS. Then measure: poster ≤ ~150 KB; landing initial transfer (excluding the lazy loop) ≤ ~600 KB; loop ≤ ~1.5 MB. If any cap is exceeded, re-encode/down-scale before committing. Confirm via the agent-browser network panel or `ls -la apps/web/public/brand/`.

- [ ] **Step 4: Pixel-verify with reduced motion + normal**

- Normal: loop plays after scroll-in.
- Emulate reduced motion (agent-browser emulate, or OS setting) → only the poster shows, no video.
Expected: both correct; poster is the visible hero on first paint.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/brand "apps/web/src/app/(marketing)/page.tsx" packages/i18n
git commit -m "feat(web): hero media (Higgsfield poster + lazy loop) within perf budget

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PHASE 2 — In-app

### Task 10: Re-skin the app shell, nav, and shared in-app cards

**Files:**
- Modify: `apps/web/src/components/app-shell.tsx`
- Modify: `apps/web/src/components/main-nav.tsx`
- Modify: `apps/web/src/components/record-card.tsx`
- Modify: `apps/web/src/components/empty-state.tsx` (re-export the ui one)

**Interfaces:**
- Consumes: `@sehatvault/ui` (Card, Button, EmptyState) + motion (PageTransition, calm tier).

- [ ] **Step 1: Adopt the shared EmptyState**

Replace the body of `apps/web/src/components/empty-state.tsx` with a re-export so existing imports keep working:
```tsx
export { EmptyState } from "@sehatvault/ui";
```
If current call sites pass props the ui version doesn't accept, adjust the call sites to the ui `EmptyState` signature (`icon`, `title`, `description`, `action`, `intent`).

- [ ] **Step 2: Wrap in-app pages in calm page transition**

In `apps/web/src/components/app-shell.tsx`, wrap the main content slot with `<PageTransition>` (import from `@sehatvault/ui/motion`) so route changes use the calm tier. Keep `OfflineBanner` and nav outside the transition so they don't re-animate.

- [ ] **Step 3: Re-skin MainNav with depth + active-state**

In `main-nav.tsx`, apply the elevation token to the bar (`[box-shadow:var(--elev-2)]`), use `--color-primary` for the active item, and a calm-tier transition on the active indicator. Preserve the existing bottom-bar/side-rail responsive behaviour and iOS safe-area insets. Active = icon + label (already the case); never colour alone.

- [ ] **Step 4: Re-skin RecordCard onto the ui Card**

In `record-card.tsx`, render the content inside `<Card interactive elevation={1}>` from `@sehatvault/ui`. Keep the exact type/status icon mapping (`record_type`/`ocr_status`) and the icon+label status already built in Sprint 6.

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: PASS.

- [ ] **Step 6: Pixel-verify /records + a member page**

- `agent-browser open http://localhost:3000/records` → screenshot desktop + 390px.
Expected: Calm Indigo, elevated record cards with hover lift (desktop), calm page transition, no horizontal scroll.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components
git commit -m "feat(web): re-skin app shell, nav, record card on Calm Indigo + calm motion

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Richer `/home` dashboard — data helper (existing data only)

**Files:**
- Create: `packages/core/src/dashboard.ts`
- Create: `packages/core/src/dashboard.test.ts`
- Modify: `packages/core/src/index.ts` (export)

**Interfaces:**
- Produces (framework-free, pure):
  - `interface DashboardStats { memberCount: number; recordCount: number; recentCount: number }`
  - `summarizeDashboard(members: { id: string }[], records: { id: string; created_at: string }[], now: Date): DashboardStats` — `recentCount` = records created within the last 7 days.

- [ ] **Step 1: Write the failing test**

`packages/core/src/dashboard.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { summarizeDashboard } from "./dashboard";

const now = new Date("2026-06-26T12:00:00Z");

describe("summarizeDashboard", () => {
  it("counts members and records", () => {
    const s = summarizeDashboard(
      [{ id: "a" }, { id: "b" }],
      [{ id: "r1", created_at: "2026-06-25T00:00:00Z" }],
      now,
    );
    expect(s.memberCount).toBe(2);
    expect(s.recordCount).toBe(1);
  });

  it("counts only records from the last 7 days as recent", () => {
    const s = summarizeDashboard(
      [],
      [
        { id: "r1", created_at: "2026-06-24T00:00:00Z" }, // 2 days ago -> recent
        { id: "r2", created_at: "2026-06-10T00:00:00Z" }, // 16 days ago -> not
      ],
      now,
    );
    expect(s.recentCount).toBe(1);
  });

  it("handles empty inputs", () => {
    expect(summarizeDashboard([], [], now)).toEqual({ memberCount: 0, recordCount: 0, recentCount: 0 });
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm --filter @sehatvault/core test dashboard`
Expected: FAIL — "summarizeDashboard is not a function".

- [ ] **Step 3: Implement**

`packages/core/src/dashboard.ts`:
```ts
export interface DashboardStats {
  memberCount: number;
  recordCount: number;
  recentCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function summarizeDashboard(
  members: { id: string }[],
  records: { id: string; created_at: string }[],
  now: Date,
): DashboardStats {
  const cutoff = now.getTime() - SEVEN_DAYS_MS;
  const recentCount = records.filter((r) => new Date(r.created_at).getTime() >= cutoff).length;
  return { memberCount: members.length, recordCount: records.length, recentCount };
}
```

Add to `packages/core/src/index.ts`:
```ts
export { summarizeDashboard } from "./dashboard";
export type { DashboardStats } from "./dashboard";
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `pnpm --filter @sehatvault/core test dashboard`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/dashboard.ts packages/core/src/dashboard.test.ts packages/core/src/index.ts
git commit -m "feat(core): summarizeDashboard helper for /home dashboard stats

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: Build the richer `/home` dashboard UI

**Files:**
- Modify: `apps/web/src/app/(app)/home/page.tsx`
- Create: `apps/web/src/components/dashboard-stats.tsx`
- Create: `apps/web/src/components/quick-capture-fab.tsx`
- Modify: `packages/i18n/src/en.ts` + `packages/i18n/src/hi.ts` (add `home.*` keys)

**Interfaces:**
- Consumes: `summarizeDashboard` (Task 11), `@sehatvault/ui`, existing `CaptureSheet`, existing `POST /api/ingest`, existing `RecordCard`.

- [ ] **Step 1: Add home i18n keys**

Add a `home` group (en + hi): `greeting`, `stats.members`, `stats.records`, `stats.recent`, `recent.title`, `recent.empty`, `quickCapture`. Match the catalog's existing format.

- [ ] **Step 2: Stats row component**

`apps/web/src/components/dashboard-stats.tsx`:
```tsx
import { Users, FileText, Activity } from "lucide-react";
import { Card } from "@sehatvault/ui";
import type { DashboardStats } from "@sehatvault/core";

export function DashboardStatsRow({
  stats,
  labels,
}: {
  stats: DashboardStats;
  labels: { members: string; records: string; recent: string };
}) {
  const items = [
    { icon: Users, value: stats.memberCount, label: labels.members },
    { icon: FileText, value: stats.recordCount, label: labels.records },
    { icon: Activity, value: stats.recentCount, label: labels.recent },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, value, label }) => (
        <Card key={label} elevation={1} className="p-4">
          <Icon className="h-5 w-5 text-[var(--color-primary)]" />
          <p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--color-ink)]">{value}</p>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Quick-capture FAB (wraps existing CaptureSheet)**

Read `apps/web/src/components/capture-sheet.tsx` first to match its real props. `apps/web/src/components/quick-capture-fab.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@sehatvault/ui";
import { CaptureSheet } from "./capture-sheet";

export function QuickCaptureFab({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        aria-label={label}
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full [box-shadow:var(--elev-3)] md:bottom-8"
      >
        <Plus className="h-6 w-6" />
      </Button>
      {open ? <CaptureSheet onClose={() => setOpen(false)} /> : null}
    </>
  );
}
```
If `CaptureSheet` expects different props (e.g. `onFile`), adapt this wrapper to drive the existing ingest flow exactly as `UploadSection` does — do not change `CaptureSheet` itself.

- [ ] **Step 4: Compose the dashboard page**

In `apps/web/src/app/(app)/home/page.tsx` (Server Component): keep the existing RLS-scoped fetches for members + records, compute `summarizeDashboard(members, records, new Date())`, then render: greeting header + family switcher (existing) → `<DashboardStatsRow>` → recent-records strip (map recent records to `<RecordCard>`, or `<EmptyState>` when none) → `<QuickCaptureFab>`. Wrap reveal-able blocks in `MotionTierBox tier="calm"`. All copy via `t()`.

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter web typecheck && pnpm --filter web build`
Expected: PASS.

- [ ] **Step 6: Pixel-verify /home (with seeded demo data), desktop + 390px**

Run dev server, ensure the demo seed is applied (`demo@sehatvault.dev` / Sharma family).
- `agent-browser open http://localhost:3000/home` → screenshot desktop + 390px.
- Click the FAB → capture sheet opens.
Expected: stats row populated, recent records shown, FAB opens capture, calm motion, elder-safe, no horizontal scroll. Also verify the empty state for a family with no records.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/src/app/(app)/home/page.tsx" apps/web/src/components/dashboard-stats.tsx apps/web/src/components/quick-capture-fab.tsx packages/i18n
git commit -m "feat(web): richer /home dashboard (stats + recent + quick-capture FAB)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

# PHASE 3 — Sweep, docs, ADR

### Task 13: Palette sweep across remaining screens

**Files:**
- Modify (as needed): `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/components/member-form.tsx`, `apps/web/src/components/record-form.tsx`, `apps/web/src/app/(app)/records/[id]/page.tsx`, `apps/web/src/app/(app)/records/[id]/edit/page.tsx`, `apps/web/src/app/(app)/members/[id]/*`, `apps/web/src/components/ui/button.tsx`

**Interfaces:** none new — visual consistency pass.

- [ ] **Step 1: Find stragglers still on old patterns**

Run: `grep -rn "0F766E\|F59E0B\|FAFAF7\|E7E5E4\|teal\|amber\|stone-" apps/web/src`
Expected after fixes: no hardcoded old hex; any Tailwind `teal/amber/stone` utility colours replaced with token-based classes (`[var(--color-...)]`) or the ui `Button`.

- [ ] **Step 2: Re-skin each flagged file**

For each hit, replace hardcoded colours with tokens and swap bespoke buttons for `@sehatvault/ui` `Button` where it fits without changing behaviour. Keep server-action wiring and validation untouched.

- [ ] **Step 3: Typecheck + build + unit tests**

Run: `pnpm -w typecheck && pnpm --filter web build && pnpm -w test`
Expected: all PASS.

- [ ] **Step 4: Pixel-verify the flows touched**

agent-browser screenshot: `/login`, `/records/new`, a `/records/[id]`, `/records/[id]/edit`, `/members/[id]/edit` — desktop + 390px.
Expected: consistent Calm Indigo; no leftover teal/amber; no horizontal scroll.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "refactor(web): Calm Indigo sweep across remaining screens

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 14: Update docs + record the ADR

**Files:**
- Modify: `docs/design/Design-System.md` (rename Warm Trust → Calm Indigo; new tokens, motion tiers, elevation, primitives)
- Modify: `docs/design/Design-Overhaul.md` (mark superseded by the approved spec)
- Modify: `docs/progress.md` (palette/brand rename; mark overhaul surfaces done)
- Modify: `CLAUDE.md` (Warm Trust → Calm Indigo references; note `packages/ui` now exists)
- Modify: `docs/Decisions.md` (add ADR-022)

**Interfaces:** none.

- [ ] **Step 1: Add ADR-022**

In `docs/Decisions.md`, append an ADR (verify the next number is 022): "Design overhaul — Calm Indigo palette + motion tiers + `packages/ui` foundation; no 3D; hero video lazy+poster; richer `/home` dashboard." Record context (static/govt-portal feel), decision, consequences (Warm Trust name retired; dark mode token-ready, deferred).

- [ ] **Step 2: Update Design-System.md**

Rename the palette section to Calm Indigo with the Task 2 token table; document the elevation ladder, gradient tokens, the three motion tiers + reduced-motion/elder rule, and the new `@sehatvault/ui` primitives as the canonical components.

- [ ] **Step 3: Update progress.md + CLAUDE.md + Design-Overhaul.md**

- `Design-Overhaul.md`: add a banner "SUPERSEDED by `docs/superpowers/specs/2026-06-26-design-overhaul-design.md` — implemented."
- `progress.md`: new completed section for the overhaul (per-surface), brand rename, note `packages/ui` exists.
- `CLAUDE.md`: replace "Warm Trust" mentions with "Calm Indigo"; update the folder-structure note that `packages/ui` is now populated.

- [ ] **Step 4: Commit**

```bash
git add docs CLAUDE.md
git commit -m "docs: Calm Indigo design system + ADR-022 + progress/CLAUDE updates

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review (completed during planning)

**Spec coverage:** §3 palette → Task 2; §4 architecture/`packages/ui` → Tasks 1,4,5,6; §5 tokens (elevation/gradient/display font/motion) → Tasks 2,3; §6 motion tiers → Task 4; §7 components → Tasks 6,10; §8 `/home` dashboard → Tasks 11,12; §9 rollout (foundation→landing→in-app→sweep) → Phases 0–3; §10 asset pipeline → Task 9; §11 perf budget → Task 9 Step 3; §12 DoD → every surface task's pixel-verify step; §13 guardrails → Global Constraints; §14 docs → Task 14. No gaps.

**Placeholder scan:** no TBD/TODO; every code step shows full code; the "read the existing file first" notes (i18n catalog format, CaptureSheet props, middleware param name) are explicit instructions to match real signatures, not placeholders.

**Type consistency:** `MotionSpec`/`resolveMotion`/`useMotionTier` consistent across Tasks 4–5; the component is named `MotionTier` in its file and exported as `MotionTierBox` (used as `MotionTierBox` in Tasks 7,12); `DashboardStats`/`summarizeDashboard` consistent Tasks 11–12; `Card`/`Button`/`EmptyState` signatures defined in Task 6 and consumed unchanged in Tasks 7,10,12.
