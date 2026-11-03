# SPARC Implementation Record

## Specification

Objective: improve Qalam's ability to measure first value, align product strategy, remove verified usability defects, and leave a release-ready evidence trail.

Acceptance criteria:

1. ATS completion and signed-in activation are distinct events.
2. Activation is emitted no more than once per workflow session.
3. Strategy, market, brand, growth, architecture, and QA decisions are recorded.
4. Public routes render without console errors or mobile horizontal overflow in the tested matrix.
5. Unit tests, lint, TypeScript, production build, and the no-dash gate pass.

## Pseudocode

```text
on successful ATS response:
  classify overall score into a stable band
  record assessment_complete with assessment context

on successful writer draft:
  if workflow activation was not recorded this session:
    store the session guard
    record activation with workflow context

on analytics storage failure:
  keep an in-memory guard
  do not interrupt the user's successful workflow
```

## Architecture

- Marketing event names remain a typed client boundary.
- Assessment tracking stays in the ATS component because it follows a complete client-visible result.
- Writer activation stays in the writer workflow hook because it follows successful generation and credit consumption.
- Session storage prevents duplicate activation across component remounts. An in-memory set covers storage-restricted browsers.
- Product, growth, and measurement definitions live in project docs so later implementation uses the same contract.

## Refinement

The initial type check failed because stale malformed Next.js development route types remained under `.next/dev`. The generated directory was moved aside, route types were regenerated with `next typegen`, and TypeScript passed. The lint pass then showed that generated bundles under `output/` were included by a singular-plural ignore mismatch. The ignore boundary was corrected, leaving source lint clean.

Browser testing found one CSS rule, `white-space: nowrap`, causing headline overflow and an unconstrained comparison table causing additional overflow. The headline may now wrap, and the table scrolls inside its own container.

## Completion

| Gate | Result |
|---|---|
| Unit tests | 443 passed |
| Targeted browser regression | 15 passed after fixes |
| Broader browser suite | 203 passed before targeted fixes, with seven failures representing two defects |
| Lint | passed after generated-output boundary fix |
| TypeScript | passed after route type generation |
| Production build | passed, 236 static pages generated |
| Dash check | passed |

## Future Refinement

- Add a server-side analytics delivery path if browser-only measurement proves unreliable.
- Replace session-level activation deduplication with durable first-ever activation when account analytics supports it.
- Add explicit Playwright assertions for the homepage contact target and comparison-table containment.
