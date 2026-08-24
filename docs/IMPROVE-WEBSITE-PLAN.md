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
| 4 | web-typography | done | DESIGN.md, homepage implementation | 2026-08-24 |
| 5 | storybrand-messaging | done | POSITIONING.md, EXPERIMENTS.md | 2026-08-20 |
| 6 | high-perf-browser | done | METRICS.md, build and responsive verification | 2026-08-24 |
| 7 | made-to-stick | done | POSITIONING.md, homepage signal map | 2026-08-24 |
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
| 2026-08-20 | 8 | Make authentication feel branded without changing auth behavior | The split auth shell improves trust while existing validation, redirects, and security controls remain intact. |
| 2026-08-24 | 2 | Use the Career Signal Map as the homepage mechanism | One supplied fact becoming LinkedIn, resume, and recruiter outputs explains the product without fake metrics or generic feature cards. |
| 2026-08-24 | 3 | Remove the auth mascot and global glow field | A geometric privacy mark and controlled paper grounds better fit a serious career product. |
| 2026-08-24 | 5 | Use Build your proof as the primary CTA | It is shorter, more ownable, and directly connected to the product mechanism. |
| 2026-08-24 | 5 | Stop presenting content heuristics as reach predictions | Qalam can review content quality but cannot know future distribution, impressions, or virality. |
| 2026-08-24 | 8 | Keep voice-profile refinement explicit | Current behavior saves examples only when the user chooses to save them, so marketing now describes that exact behavior. |

## 2026-08-24 Upgrade Log

- Rebuilt the homepage around one evidence-led narrative and one dominant CTA.
- Added a code-native signal map instead of synthetic people, fake dashboards, or invented customer proof.
- Reduced the homepage to the conversion-critical sequence: promise, mechanism, workflow, free utility, trust rules, Career Vault, pricing, FAQ, and final CTA.
- Preserved teal, gold, warm paper, and zinc while reducing repetitive cards and ambient visual noise.
- Converted the homepage shell from a full client component to a server component with isolated client analytics and interactive tools.
- Removed unsupported virality, reach, and automatic voice-learning claims from critical public surfaces and APIs.
- Replaced the auth character with a privacy and evidence-control mark.
- Hardened cross-workspace mutations, approval ownership, owner membership, plan scoping, OAuth revocation, password changes, referral redemption, provider enumeration, and AI model fallback.
- Production funnel data and permissioned customer outcomes are still missing. No score should pretend those evidence gaps are solved.

## Next Actions

- [ ] Add the first meaningful activation event. Homepage visit, primary CTA, resume-check start, signup complete, and paid conversion are instrumented (engineering)
- [ ] Ask new users what almost stopped them from signing up (growth)
- [ ] Collect three named, permissioned customer outcome stories (founder)
- [ ] Run the homepage promise as a bold A-B test after baseline data exists (growth)
- [ ] Complete contrast automation and semantic color consolidation (design engineering)
