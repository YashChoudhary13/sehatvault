# SehatVault — Planning Workspace Index

This workspace turns the product spec (`../README.md`) into an executable engineering plan. **No production code yet** — these are planning artifacts. Implementation begins only after sign-off (see `docs/Phase0-Architecture-Review.md` → final recommendation).

## Reading order
1. **`docs/Phase0-Architecture-Review.md`** — critical review of the spec vs. constraints; risks; what we cut and why. *Read this first.*
2. **`docs/MVP.md`** — Must / Should / Nice / Post-MVP. The scope contract.
3. **`docs/Scope.md`** — in/out boundaries, scope-cut levers.
4. **`docs/Decisions.md`** — ADRs (every architectural decision + rationale).
5. **`docs/Milestones.md`** — M0–M4 outcome milestones with exit criteria.
6. **`docs/Risks.md`** — risk register with owners and mitigations.
7. **`architecture/Engineering-Plan.md`** — monorepo, packages, env, deploy, branch, CI/CD, testing.
8. **`database/Schema.md`** — ER model, SQL DDL plan, RLS policies, storage layout.
9. **`api/API-Spec.md`** — every endpoint, request/response, auth, permissions.
10. **`security/Security-Plan.md`** — auth, permission model, DPDP, encryption, threat model.
11. **`design/UX-Plan.md`** — screen hierarchy, flows, states, wireframes.
12. **`roadmap/Roadmap.md`** + **`roadmap/Sprints.md`** — phased roadmap + 10 weekly sprints.
13. **`tasks/Backlog.md`** — epics → stories → tasks, effort, dependencies.

## The one-paragraph reconciliation
The README proposed a mobile-first app with a NestJS API gateway, a Python AI service, and Redis. Your constraints (Supabase backend, Vercel, web-first, solo-dev, "no unnecessary microservices") let us **delete the NestJS gateway and Redis entirely**, keep **one** thin Python AI service, and ship a **mobile-responsive web PWA** first. This is *less* architecture, not more — consistent with the README's own "don't over-engineer" warnings. The product vision (family-first, vernacular, WhatsApp capture, ABDM-ready, DPDP-compliant) is unchanged; only the delivery shell is simpler and web-first.
