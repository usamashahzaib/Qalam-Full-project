# Qalam launch readiness audit

Date: 2026-08-20

## Verdict

The audited code is materially safer and more reliable than the starting snapshot. Public routes, responsive layouts, SEO, authentication guards, build, unit tests, dependency audit, and database RLS gates are green.

Do not onboard production clients until the final staging smoke test is completed with seeded Free, Solo, Pro, Agency, admin, editor, viewer, and client reviewer accounts. Payment activation, cancellation, scheduling, approval email delivery, and LinkedIn publishing must be exercised against sandbox integrations with those accounts.

## Fixed during this audit

- Credentials sessions now fail closed when password versions are missing or stale across API, workspace, admin, and plan paths.
- Browser extension tokens now carry and validate password versions, so a password change revokes extension access too.
- Workspace member additions and pending invite reservations now enforce seat limits under a database advisory lock.
- Signup invite redemption respects the current workspace seat limit and leaves an invite pending when a seat is unavailable.
- DOCX resume parsing now limits archive entries, expanded bytes, and compression ratio before Mammoth processes content.
- Career applications can attach only resumes owned by the active workspace.
- Career add-on routing and idempotency use the signed body event name, not an unsigned request header.
- External approval links expire after seven days and their token is cleared after approve or reject.
- The public health endpoint no longer exposes backend error strings or latency details.
- Login and pricing interactive controls meet the 44 pixel touch target baseline.
- ATS checker state restoration no longer triggers the React synchronous effect-state lint violation.
- Release-aware browser tests now reflect the intentionally disabled Agency plan and the actual comment generator sign-in flow.
- The redundant `app_notifications` policy was removed from the remote database. RLS checks now report zero findings.

## Verification evidence

- ESLint: pass
- Production build: pass, 273 pages generated
- Unit tests: 357 of 357 pass
- Browser tests: 210 of 210 pass across 360, 375, 430, 768, 1024, 1280, and 1440 pixel layouts
- Production dependency audit: zero known vulnerabilities
- RLS readiness: zero findings
- Career add-on readiness: pass
- Dash policy: pass
- Git whitespace validation: pass

## Design and color findings

The main public experience is coherent with the teal, gold, warm-white, and zinc brand direction. Hero hierarchy, CTA prominence, pricing comprehension, mobile overflow, navigation, labels, and reduced viewport behavior were checked.

The codebase still contains 105 unique raw hex values across `app` and `components`. Some are intentional provider colors and carousel themes, but the count is too high for a disciplined design system. This is a maintainability and consistency risk, not a reason for a blind global replacement. The next design-system pass should inventory each value, preserve semantic or provider-specific colors, and move repeated brand, surface, border, text, success, warning, and danger values into named tokens with automated contrast checks.

## Remaining release gates

1. Deploy this exact code revision so the application matches the already-applied database migrations.
2. Run authenticated staging smoke tests for every plan and workspace role.
3. Run sandbox payment purchase, renewal, cancellation, refund, and replay tests.
4. Run real email delivery tests for verification, reset, invitation, approval, and contact workflows.
5. Run LinkedIn OAuth, publish, scheduled publish, token expiry, and reconnect tests with a test LinkedIn account.
6. Add automated WCAG contrast testing before consolidating the remaining raw color values.

## Audit limits

Public browser paths and repository-wide static, build, test, dependency, and database checks were executed. Live third-party side effects and authenticated paid-plan journeys require staging credentials and provider sandbox accounts, so they remain explicit release gates rather than assumed successes.
