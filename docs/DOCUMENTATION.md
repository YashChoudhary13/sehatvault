# SehatVault — Documentation Map

> How the docs are organised, **who owns which topic**, and the rule for resolving conflicts.
> **If two documents disagree, the topic owner listed here is the source of truth.**

## Folder structure

```
README.md                         # root: what SehatVault is + how to run (operational front page)
CLAUDE.md                         # root: session-entry memory for AI/Claude Code
docs/
├── DOCUMENTATION.md              # this map + ownership + authority
├── Vision.md                     # product "why": problem, market, personas, GTM, business model
├── Decisions.md                  # ADRs (canonical decisions, ADR-001..021)
├── progress.md                   # living status: done / in-progress / pending / blockers
├── Dev-Setup.md                  # local bootstrap (dev/prod parity)
├── Risks.md                      # risk register
├── architecture/Engineering-Plan.md   # monorepo, deploy, CI, testing
├── database/Schema.md            # schema, RLS, storage
├── api/API-Spec.md               # endpoint contracts
├── security/Security-Plan.md     # threat model, DPDP, encryption
├── design/                       # Design-System.md, UX-Plan.md
├── planning/Planning.md          # scope, milestones, roadmap, sprints, backlog (merged)
├── pr-history/                   # one retrospective per merged PR
└── history/                      # frozen, point-in-time records (not current truth)
    ├── Original-Product-Spec.md      # the original README (legacy delivery stack)
    ├── Phase0-Architecture-Review.md # the web-first pivot review
    └── Planning-Archive.md           # demoted sign-off / final-recommendation
```

## Topic ownership (source of truth)

| Topic | Owner doc | Notes |
|---|---|---|
| **Status / what's next** | `progress.md` | The only living tracker. Planning is the static plan. |
| **Decisions (ADRs)** | `Decisions.md` | Wins over any other doc on a decision. |
| **Product vision / "why"** | `Vision.md` | Canonical narrative; full original preserved in `history/`. |
| **Architecture / build** | `architecture/Engineering-Plan.md` | Monorepo, deploy, CI, testing. |
| **Database** | `database/Schema.md` | Schema, RLS, storage. |
| **API** | `api/API-Spec.md` | Endpoint contracts. |
| **Security / DPDP** | `security/Security-Plan.md` | Threat model, encryption, compliance. |
| **Design** | `design/Design-System.md`, `design/UX-Plan.md` | Tokens, screens, flows. |
| **Planning (scope/milestones/roadmap/sprints/backlog)** | `planning/Planning.md` | Merged; aligned to current reality. |
| **Risks** | `Risks.md` | Risk register. |
| **Dev setup** | `Dev-Setup.md` | Dev/prod parity. |
| **Session entry (AI)** | `CLAUDE.md` (root) | Current-state snapshot + rules. |
| **PR history** | `pr-history/` | Retrospective per PR. |
| **History / past context** | `history/` | Frozen; never current truth. |

## Conventions
- **Living docs** are maintained; **`history/` is frozen** (date-stamped, not updated).
- Dependent docs carry a **"Related docs"** link block.
- **Authority rule:** on any conflict, the **owner doc above** is correct; raise a PR to fix the other.
- Current ground truth is summarised in `CLAUDE.md` and the top of `planning/Planning.md`.
