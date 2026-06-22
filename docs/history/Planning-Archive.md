# Planning Archive (historical)

> **Frozen historical record — not current truth.** Captures the point-in-time sign-off and final
> recommendation from the original planning workspace (former `tasks/Backlog.md`), preserved when the planning
> docs were merged into [`../planning/Planning.md`](../planning/Planning.md). Current planning lives there;
> current status in [`../progress.md`](../progress.md).
>
> The full original planning files (MVP, Scope, Milestones, Roadmap, Sprints, Backlog) remain in **git history**
> prior to the docs-consolidation commit.

## Final Recommendation (pre-build review)
- **Architecture confidence:** 8.5/10 for the web-first MVP — remaining risk concentrated in two *testable* places: extraction accuracy (T1) and RLS isolation (T4).
- **Biggest technical risks:** extraction accuracy (T1); RLS correctness (T4); PHI-to-LLM residency (T5 — *now a production-only concern*); external approval lead times (S2 — *since resolved* by email OTP + the NotificationProvider abstraction).
- **Recommended MVP scope:** the 7-part spine — auth + family/RLS · capture + encrypted storage · AI auto-organise → timeline · lab trends · scoped/expiring/logged doctor share · reminders · DPDP consent/audit/export/delete — in English + Hindi with elder mode.
- **Timeline:** ~18–20 weeks realistic (16-week aggressive) for a solo developer.

## Sign-off (superseded)
The original plan gated all implementation behind a sign-off ("no production code until sign-off"). That gate is
**historical**: implementation has begun and PR1 (foundation) is merged. Decisions are now tracked as ADRs in
[`../Decisions.md`](../Decisions.md); the architecture pivots are summarised in `../planning/Planning.md` §8.
