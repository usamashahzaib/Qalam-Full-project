# Improve Website Plan

## Context

- Started: 2026-08-20
- Scope: public Qalam website, led by the homepage conversion journey
- Primary homepage action: create a free account
- Transitional action: run the free resume check without an account
- Current evidence: repository audit, 210 browser checks, live visual inspection, current product behavior, and existing public copy
- Missing evidence: production funnel analytics, visitor interviews, exit surveys, and real customer outcome stories

## Phase Status

| Phase | Skill | Status | Artifact | Date |
|---|---|---|---|---|
| 1 | cro-methodology | awaiting-evidence | METRICS.md, WEBSITE.md, EXPERIMENTS.md | 2026-08-20 |
| 2 | ux-heuristics | done | DESIGN.md, EXPERIMENTS.md | 2026-08-20 |
| 3 | refactoring-ui | done | DESIGN.md, EXPERIMENTS.md | 2026-08-20 |
| 4 | web-typography | pending | DESIGN.md, EXPERIMENTS.md | |
| 5 | storybrand-messaging | done | POSITIONING.md, EXPERIMENTS.md | 2026-08-20 |
| 6 | high-perf-browser | pending | METRICS.md, WEBSITE.md, EXPERIMENTS.md | |
| 7 | made-to-stick | pending | POSITIONING.md, EXPERIMENTS.md | |
| 8 | design-everyday-things | done | DESIGN.md, EXPERIMENTS.md | 2026-08-20 |

Statuses: pending, in-progress, awaiting-evidence, done, deferred, skipped.

## Key Decisions

| Date | Phase | Decision | Rationale |
|---|---|---|---|
| 2026-08-20 | 1 | Treat free account creation as the homepage conversion | It unlocks the connected product while keeping the offer low risk. |
| 2026-08-20 | 1 | Use the free resume check as the transitional CTA | It delivers value before signup and addresses trust and effort objections. |
| 2026-08-20 | 3 | Preserve teal, gold, warm white, and zinc | The existing palette is distinctive. The problem is hierarchy and token fragmentation, not the core brand. |
| 2026-08-20 | 5 | Lead with visible proof built from real experience | This connects resumes, LinkedIn, and content through one repeatable promise. |
| 2026-08-20 | 2 | Use contextual light and dark marketing navigation | Light pages retain visual continuity while dark hero pages preserve the premium brand frame. |
| 2026-08-20 | 8 | Make authentication feel branded without changing auth behavior | The split auth shell and password guardian improve trust while existing validation, redirects, and security controls remain intact. |

## Next Actions

- [ ] Add the first meaningful activation event. Homepage visit, primary CTA, resume-check start, signup complete, and paid conversion are instrumented (engineering)
- [ ] Ask new users what almost stopped them from signing up (growth)
- [ ] Collect three named, permissioned customer outcome stories (founder)
- [ ] Run the homepage promise as a bold A-B test after baseline data exists (growth)
- [ ] Complete contrast automation and semantic color consolidation (design engineering)
