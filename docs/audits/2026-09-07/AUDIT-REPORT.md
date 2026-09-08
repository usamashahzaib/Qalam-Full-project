# Qalam website and webapp audit

Date: 2026-09-07, remediated and reverified 2026-09-08. Scope: public discovery, rendered public pages, authenticated core journeys, application boundaries, AI writing, scoring, persistence, scheduling, PWA behavior, dependencies and release checks.

This is an evidence-based engineering audit, not a guarantee that every defect has been found. Public browser coverage is substantially broader than authenticated workflow coverage. A passing build or test does not prove production behavior, writing quality, indexing, or security as a whole.

## Changes and ownership

Claude was concurrently changing AI writing in this workspace. Its commit `5a4ba47` also captured earlier audit fixes. This report covers audit work across that commit and subsequent working-tree changes. The writing changes were preserved and tightened after live model evaluation exposed invented technical specifics. Four backward-compatible migrations were applied to the configured database. No web deployment, payment, email, or LinkedIn publishing operation was performed as part of this audit.

## Confirmed findings and remediation

Severity describes impact, not a claim of active exploitation. Fixed means changed locally and checked at the indicated layer. It does not mean deployed.

| ID | Priority | Trigger and impact | Local remediation and evidence |
|---|---|---|---|
| D01 | High | Live robots rules used private-route prefixes. `/career` also matched `/career-visibility` and `/careers`; `/agency` matched `/agency-setup`. Three sitemap URLs were disallowed. | Exact, query and child-path rules replace broad prefixes in `app/robots.ts`. `crawl-discovery.test.ts` checks public URLs and private variants for each configured agent. Live baseline: `live-discovery.json`. |
| D02 | Medium | Live sitemap contained 99 entries but only 81 unique URLs. Eighteen landing pages were emitted twice. | Removed duplicate landing-page mapping in `app/sitemap.ts`. Local crawl and discovery tests confirm unique URLs. |
| D03 | Medium | Structured data advertised site search at `/blog?q=...`, but blog does not implement that search. | Removed the unsupported SearchAction from `app/layout.tsx` and `lib/seo.ts`. Discovery regression checks cover its removal. |
| D04 | Low | Landing-page modification metadata did not use the landing page's maintained update date. | `lib/seo.ts` resolves the page-specific `updatedAt`. This is metadata consistency, not a ranking claim. |
| D05 | Medium | Public links to protected app paths could be resolved to the marketing origin inconsistently, including nested/query variants. | Extended `resolvePublicHref` protected route recognition. Existing origin/discovery tests pass. |
| S01 | High | A score gate could raise evaluated content to the ready threshold of 82, while free-tier attempts could cap the same content differently. | Removed the ready-score floor and retry-based cap. `content-score-gate.test.ts` checks preservation of measured low scores. |
| S02 | High | Scoring provider failure returned substitute heuristic scores, making failure look like a completed evaluation. | `score-post.ts` returns AI_UNAVAILABLE instead. `scoring-integrity-audit.test.ts` covers provider failure and invalid dimensions. |
| S03 | Medium | Low scores could be multiplied by ten; model overall could disagree with its dimensions. | Validate dimension range, keep low values, and calculate overall from evaluated dimensions. Regression tests cover these cases. |
| S04 | Medium | Word/line-count caps prevented concise content reaching readiness and encouraged padding. | Removed arbitrary minimum-length/paragraph caps. Empty content and the platform character limit remain objective constraints. |
| S05 | Medium | Invalid or failed scoring requests could consume quota, and cache failure could conceal a completed score. | Validate before charging; refund queue rejection, queue exception and scoring failure; make cache writes best effort. `score-route-accounting.test.ts` invokes the route with controlled failures. |
| S06 | Medium | Score cache scope omitted workspace context. | Added workspace and policy version to the key, preventing reuse across the same user's client contexts. |
| A01 | High | Six AI mutation endpoints lacked the editor gate enforced on sibling generation routes. A workspace viewer could initiate generation and potentially consume owner quota. | Added editor authorization to comments, replies, hook alternatives, competitor analysis and both strategist POST routes. Behavioral viewer/editor cases are in `workspace-mutation-authorization.test.ts`. |
| A02 | Medium | An active admin override passed plan admission but returned `isActive: false`, allowing downstream checks to reject it again. | Return effective active state. `require-plan.test.ts` verifies the returned flag for an expired base plan with an active override. |
| P01 | Medium | Repository creation accepted fewer statuses than the database contract; fallback persistence and returned status could disagree. | Aligned accepted statuses and returned persisted status. `post-persistence-audit.test.ts`. |
| P02 | Medium | Duplicating a carousel could lose its type stored in metadata. | Preserve metadata type in the duplicate and returned post. Persistence regression tests. |
| P03 | High | Post edits wrote the content version, post fields and metadata type separately. A concurrent publisher could observe a partial edit, and a publishing post could still accept content changes. | Added a service-only `update_post_atomically` database function with row locking, publishing-state rejection, version snapshot and a single update. Type is trimmed and validated. Repository and route use the function; migration and route contract tests cover it. |
| H02 | Medium | Conversation history was scoped by user only, so one agency user could see their own conversation from a different client workspace. | Added `workspace_id`, unambiguous legacy backfill, workspace indexes and service-only create/append functions. All conversation reads and mutations now include workspace scope. Ambiguous legacy rows remain hidden rather than being assigned to a guessed workspace. |
| C01 | High | Rescheduling and calendar display mixed UTC string slicing with browser local time. Near midnight, the displayed day/time could shift. | Browser computes an explicit instant for the chosen local day. Calendar uses local formatting; list fetches and immediate mutation responses use the same date conversion. `calendar-date.test.ts`. |
| C02 | Medium | Retry scheduled a failed post at the current instant, while the API requires a future time. | Retry uses a future instant, avoiding immediate rejection by the existing future-time check. |
| C03 | High | A stale queue delivery could publish a post after its schedule moved into the future. | Check due time before locking and include due time in the atomic database claim. `scheduled-publish-audit.test.ts`. |
| C04 | High | Worker could publish the earlier fetched content even when the claim returned a newer row. | Publish the claimed row. Behavioral regression supplies different fetched and claimed content. |
| C05 | High | Reconciliation treated missing or unreadable success logs as proof publishing had not happened, permitting an automatic duplicate publish. | Keep uncertain outcomes in publishing, report `needsReview`, and log review-required events. Only verified success can finalize. Failed finalization is not counted as success. This deliberately leaves an operational recovery requirement below. |
| C06 | High | Worker checked the post author's personal subscription instead of the workspace billing principal, potentially rejecting agency editor posts. | Resolve workspace owner and effective plan, matching request-time entitlement rules. Tests cover owner lookup, expired entitlement and active override. |
| W01 | Medium | App-origin requests for service worker resources could redirect to the marketing origin, breaking same-origin registration. | Exempt `sw.js`, `offline.html` and manifest from marketing redirects. Proxy tests cover resources and retained marketing redirects. |
| W02 | Medium | Offline installation cached `/`, whose response can vary with session state. Registration after the load event could also be missed. | Cache a static noindex offline page, clean only old Qalam cache versions, register immediately when load already completed. `pwa-routing-audit.test.ts` executes installation and checks its cached resource. This is prevention of session-dependent caching, not proof of cross-user disclosure. |
| H01 | Medium | Strategist history selected the oldest 20 messages indefinitely, dropping the latest conversation context. | Select newest 20 and reverse for chronological model input in both strategist routes. Source-reviewed; long-conversation live behavior remains unverified. |
| C07 | High | An unknown LinkedIn response could be recorded as a definite failure and become eligible for an unsafe retry. Operators had logs but no dedicated reconciliation path. | Manual and scheduled unknown outcomes remain in `publishing`. Added an admin review queue and service-only resolution function requiring an explicit `published` or `not_published` decision and an audit note. Generic LinkedIn transport errors now return `reviewRequired` without releasing the publish claim. |
| AI01 | High | The insightful-comment instruction invited a detail from the writer's own area. A live case produced invented node counts, latency movement, deployment timing and incident details. | Replaced that instruction with grounded implication, marked opinion or question guidance. It explicitly forbids invented incidents, measurements, timelines, implementation details, causes, results and experience. Production sanitization remains active. A one-repeat live suite produced 54 current comments and 10 current posts with zero configured forbidden-claim, claim-shaped-line or stock-phrasing flags. Human blinded rating remains required for a quality conclusion. |
| X01 | Medium | Safari/WebKit upgraded local production-preview CSS and JavaScript from HTTP to HTTPS because the CSP always emitted `upgrade-insecure-requests`. Pages rendered unstyled and overflowed on mobile. | CSP now emits that directive only when the configured public origin is HTTPS. The deployed HTTPS posture is preserved. Homepage product media also has intrinsic-width containment. WebKit mobile width probes and the release matrix verify the fix. |
| GEO01 | Low | Lighthouse's experimental `llms.txt` audit could not recognize bare URLs as links. | Converted the canonical, full-corpus and RSS entries to Markdown links and added a discovery regression assertion. |
| T01 | Low | Homepage language and docs were vague or implied unsupported behavior. | Replaced hero paragraph and six docs descriptions with concrete setup, saved examples, review, scheduling and analytics instructions. Clarified manual carousel handling and score limitations. |
| DEP01 | Advisory | Installed transitive packages matched 3 npm advisories: xmldom moderate, browserslist high, fast-uri high. | Updated lockfile within dependency constraints: xmldom 0.8.13 to 0.8.15, browserslist 4.28.2 to 4.28.9, fast-uri 3.1.4 to 3.1.7. Post-update npm scan reported zero advisories. App exploitability was not established. |

## Coverage and evidence

- `local/public-crawl.json`: 81 unique sitemap pages on local development server, 390 x 844 viewport. All returned 200, had one H1, and had no observed horizontal overflow above tolerance, broken loaded images, unnamed visible buttons, JSON parse errors in structured data, or page exceptions. This checks structure, not every interaction or schema eligibility.
- `production/public-crawl.json`: repeated the same 81-page crawl against the final local production build. All checks above passed again. Home viewport screenshots at 390 and 1440 were visually inspected.
- `production/extra-routes.json`: 11 additional route/resource checks. Login, signup, docs, extension download/connect and offline resources returned 200; both legacy writer aliases returned 308 to `/linkedin-post-writer`, which is covered by the sitemap crawl.
- `live-discovery.json`: read-only live robots, sitemap and app login baseline. Preserve its timestamp; local fixes do not retroactively alter it.
- Final browser release suite covers 10 public/auth pages, eight widths from 360 to 1440, tap targets, names, focus, skip links, mobile menu, reduced motion, 200 percent zoom and 404 behavior. Chromium passed 133/133 and Firefox passed 133/133. WebKit passed 132/133 in one full run; its only failure was Safari's macOS default of skipping links during Tab navigation. The corrected Safari-specific skip-link check then passed independently and verifies focus visibility plus activation.
- Unit and route checks cover isolated logic with mocked providers and persistence. They do not call LinkedIn or prove real multi-user database isolation.
- Authenticated production-browser coverage created a temporary account, signed in, exercised the writer and AI generation path, dashboard, settings and plan gates, then deleted the account and associated data. Both authenticated checks passed. It did not buy a plan, send email, invite a real user or publish to LinkedIn.
- Live migration checker: 65 applied migrations verified. Live RLS checker after migration: no findings in its policy/grant checks; zero public-schema policies and zero anon/authenticated table grants were reported. Eleven designated service-only tables passed. This does not test all server-side service-role authorization paths.
- Build, lint and final test output are saved alongside this report. Environment filenames may appear in build output; credentials are not included.

## Open findings and practical limits

1. **Writing quality.** Automated checks cannot establish that prose reads as human or that every statement is true. The final direct-provider run found zero configured claim and stock-phrasing flags in 54 current comments and 10 current posts, but its mean source-anchor hit rate was 0.22 for comments and 0.40 for posts. A person still needs to complete the generated blinded sheet against real author samples. No claim of complete AI-slop eradication is made.
2. **External side effects.** Paid checkout, real email delivery, team invitation acceptance, LinkedIn OAuth and an actual LinkedIn publish were not exercised. The unknown-outcome recovery path is covered at route, function and admin-UI layers, but a controlled provider fault-injection exercise remains operational work.
3. **Performance.** Local Lighthouse after the final accessibility and discovery changes scored accessibility 100, best practices 100 and SEO 100. Performance scored 52 with FCP 1.4 seconds, LCP 5.2 seconds, TBT 1,170 ms and CLS 0 under simulated throttling. The prior run scored 79, so these local results are noisy and are not field Core Web Vitals. Script evaluation and layout dominated the slower trace. Production field data and bundle-level performance work remain necessary.
4. **Accessibility limits.** Automated structure, contrast, focus, target-size, reduced-motion and responsive checks passed in the tested matrix, including accessibility 100 in Lighthouse. This is not a screen-reader audit or a WCAG conformance claim.
5. **Deployment.** Database migrations are applied, but the website and webapp source changes are not deployed. No post-deployment crawl, production smoke test or Search Console validation is claimed.

## Website content and SEO / GEO / AEO / LLMO priorities

The first priority is deploying the crawl fixes and checking the three affected public URLs in Search Console. Do not confuse robots eligibility with guaranteed indexing.

The docs changes are implemented. The next useful content additions require real evidence: a consented customer workflow showing source notes, edited output and approval steps; a voice-training example with permission; and a scoring-methodology explanation that separates editorial evaluation from predicted reach. Do not manufacture testimonials, client results, author expertise or statistics to fill these pages.

Maintain explicit answers about supported formats, manual carousel handling, permissions, data retention, plan limits and cancellation wherever the actual product supports them. Keep page copy and structured data consistent. Consolidate overlapping pages only after search query and conversion evidence identifies cannibalization; route count alone is not evidence.

Qalam already has AI-readable text endpoints. Additional special AI files and schema are not a substitute for indexable useful pages. Google's AI search guidance says normal SEO practices apply and does not require special AI markup or files. This audit makes no promise that llms.txt, a schema change or content wording will secure an AI citation.

## References

- [Google robots matching specification](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec): prefix matching and end anchors underpin D01.
- [Google AI features guidance](https://developers.google.com/search/docs/appearance/ai-features): ordinary search fundamentals apply; special AI markup/files are not required.
- [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies): markup must accurately describe page content.
- [xmldom advisory](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6), [browserslist advisory](https://github.com/advisories/GHSA-c83g-rgw3-j3cx), [fast-uri advisory](https://github.com/advisories/GHSA-fph4-wmhf-6fwf): dependency findings, not app exploit proofs.

## Final verification

| Check | Completed result |
|---|---|
| Unit and route suite | 100 files, 663 tests passed in a resource-controlled full run. Four files that hit concurrent 30-second timeouts also passed 82/82 in isolation. |
| Production build | Passed after the final source changes, including 65-migration verification, TypeScript and 237 generated routes. |
| Lint | Passed without warnings. See `lint.log`. |
| Production public crawl | 81 pages, zero failures in the recorded structural checks. |
| Dependency scan | Zero reported advisories after updates. See `dependencies.json`. |
| Live database policy/grant check | Passed the checker's scope. See `database-rls.log`. |
| Repository punctuation check | Passed. See `dashes.log`. |
| Whitespace diff check | Passed. Git emitted line-ending conversion notices, not whitespace errors. |
| Authenticated production journey | 2/2 passed, including temporary-account cleanup. |
| Production browser interaction suite | Chromium 133/133; Firefox 133/133; WebKit 132/133 full-run checks plus the corrected Safari-specific skip-link check passed independently. |
| Live AI prompt evaluation | 3 test phases passed, 1 environment guard skipped; 54 current comments and 10 current posts had zero configured claim or stock-phrasing flags. See `scripts/eval/output/summary.md` and the blinded sheet. |
| Lighthouse | Accessibility 100, best practices 100, SEO 100; performance 52 with the limitations recorded above. |

The final production build completed after the CSP, homepage media and `llms.txt` changes. This report was updated afterward and does not affect runtime behavior.
