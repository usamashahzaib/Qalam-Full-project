# Qalam QA Bug Report
**Date:** 2026-06-11  
**Tester:** Claude Code (automated Playwright + code review)  
**Scope:** Full site — marketing, auth, free tools, app route guards, API routes, app page code review

---

## Summary

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 1 | 1 | 0 |
| High | 5 | 5 | 0 |
| Medium | 3 | 3 | 0 |
| Low | 2 | 1 | 1 |
| Not a bug | 2 | — | — |

---

## CRITICAL — Fixed

### BUG-001: Viral Checker crashes with React render error
- **Page:** `/free-tools/viral-checker`
- **What happened:** After clicking "Analyze with AI", the page crashed with: `Error: Objects are not valid as a React child (found: object with keys {hook})`. The error boundary caught it but the results panel never rendered.
- **Root cause:** The AI returns `improved_version` as `{ "hook": "..." }` (an object) instead of a plain string. The component tried to render it directly as a React child.
- **Fix applied:** Added `getImprovedVersion()` helper in `app/free-tools/viral-checker/page.tsx` and `extractImprovedVersion()` in `components/tools/ViralCheckerTool.tsx` to safely extract the string from either a string or object value.
- **Status:** FIXED

---

## HIGH — Fixed

### BUG-002: Duplicate "| Qalam | Qalam" in page `<title>` tags
- **Pages affected:** `/pricing`, `/contact`, `/legal/terms`, `/legal/privacy`, `/terms`, `/free-tools`, `/free-tools/hook-generator`, `/free-tools/headline-analyzer`, `/free-tools/profile-optimizer`, `/agency-setup`
- **Root cause:** Root `app/layout.tsx` uses template `"%s | Qalam"`. Pages were already setting titles with `| Qalam` suffix.
- **Fix applied:** Removed `| Qalam` from root `title:` field in all 10 affected pages. OG titles left intact.
- **Status:** FIXED

### BUG-003: Three free tool pages had generic homepage title
- **Pages affected:** `/free-tools/viral-checker`, `/free-tools/engagement-predictor`, `/free-tools/carousel-builder`
- **Root cause:** Next.js App Router forbids `export const metadata` from `"use client"` pages. No parent layout existed.
- **Fix applied:** Created `layout.tsx` server components with proper metadata for each route.
- **Status:** FIXED

### BUG-004: Wrong pricing and CTA copy on Free Tools page
- **Page:** `/free-tools`
- **What happened:** CTA showed "$19 per month" and "Start 7-Day Free Trial". Qalam prices in PKR and has no trial.
- **Fix applied:** Changed to "PKR 1,490/month" and "Start free - no card needed".
- **Status:** FIXED

### BUG-005: Login, Signup, and Forgot-Password pages had generic site title
- **Pages:** `/login`, `/signup`, `/forgot-password`
- **Root cause:** "use client" pages with no parent layout.
- **Fix applied:** Created `layout.tsx` server components with page-specific titles and `robots: noindex`.
- **Status:** FIXED

### BUG-010 (reclassified High): Blog post titles doubled the brand name
- **Page:** All `/blog/[slug]` pages
- **What happened:** `generateMetadata` set `title: "${post.title} | Qalam"`. Root layout template added another `| Qalam`.
- **Fix applied:** Changed to `title: post.title` so the template produces `Post Title | Qalam` correctly.
- **Status:** FIXED

---

## MEDIUM — Fixed

### BUG-006: Copy button in Hook Generator silently fails in some browsers
- **Page:** `/free-tools/hook-generator`
- **Root cause:** `navigator.clipboard.writeText()` blocked in non-HTTPS context. `setCopied()` was inside the try block so no feedback showed.
- **Fix applied:** Added `execCommand('copy')` fallback; `setCopied()` moved outside try/catch.
- **Status:** FIXED

### BUG-007: Contact form had no custom inline validation
- **Page:** `/contact` (ContactForm component)
- **What happened:** Submitting empty or invalid fields only showed browser-native tooltip validation (invisible on mobile Safari).
- **Fix applied:** Added client-side `validateFields()` function with per-field error state. Form now shows red inline error text under each invalid field. Added `noValidate` to suppress native browser tooltips.
- **Status:** FIXED

### BUG-008: Duplicate `/terms` and `/legal/terms` routes
- **What happened:** Both routes rendered independently. `/privacy` already redirected to `/legal/privacy` correctly, but `/terms` did not.
- **Fix applied:** Replaced `app/terms/page.tsx` content with a `redirect("/legal/terms")` call. The original page body is now only at `/legal/terms` which has proper canonical.
- **Status:** FIXED

---

## LOW

### BUG-011: Announcement banner re-appeared after dismiss on page navigation
- **Page:** Global — all marketing pages
- **Root cause:** `announcementVisible` was only in React state with no persistence.
- **Fix applied:** Added `useEffect` on mount to read `localStorage.getItem("qalam_announce_dismissed")`. Dismiss button now writes `"1"` to that key before hiding the banner.
- **Status:** FIXED

### BUG-013: App page browser tab titles all show homepage title
- **Pages:** `/dashboard`, `/writer`, `/carousels`, `/settings`, and all other `app/(app)/*` routes
- **What happened:** None of the app pages export metadata. Since the root layout's `default` title is the homepage tagline, all app tabs show "Qalam - AI LinkedIn Writer & Post Generator with Voice Memory".
- **Severity:** Low (app is behind auth, no SEO impact).
- **Recommended fix:** Add a title template to `app/(app)/layout.tsx` (e.g. `template: "%s | Qalam"`) and export page-level `metadata` from each app page's server wrapper.

---

## Not a Bug

### BUG-009 (Closed — not a bug): Inconsistent CTA links
- **Finding:** Originally noted as "pricing CTAs link to /signup while others link to /login". After checking `app/page.tsx`, all landing page CTAs point to `/login`. The only `/signup` link is in the login page itself as "No account? Create one free." This is the standard pattern — not an inconsistency.

### BUG-012 (Closed — not a bug): Demo "Save and schedule" button no action
- **Finding:** The button in `WriterTab` calls `onStart`, which calls `handleStart`, which calls `openPanel("sign-up")`. This correctly opens the signup panel. The button is wired up.

---

## Routes Tested (HTTP Status)

| Route | Status | Auth Guard | Notes |
|-------|--------|-----------|-------|
| `/` | 200 | - | OK |
| `/pricing` | 200 | - | Title fixed |
| `/about` | 200 | - | OK |
| `/blog` | 200 | - | OK |
| `/blog/[slug]` | 200 | - | Title fixed (BUG-010) |
| `/docs` | 200 | - | OK |
| `/contact` | 200 | - | Inline validation added |
| `/careers` | 200 | - | OK |
| `/changelog` | 200 | - | OK |
| `/status` | 200 | - | OK |
| `/demo` | 200 | - | OK (save button opens signup panel) |
| `/free-tools` | 200 | - | Pricing copy fixed |
| `/free-tools/hook-generator` | 200 | - | Working, copy fallback added |
| `/free-tools/headline-analyzer` | 200 | - | Working |
| `/free-tools/profile-optimizer` | 200 | - | Working |
| `/free-tools/viral-checker` | 200 | - | Crash fixed, title added |
| `/free-tools/engagement-predictor` | 200 | - | Title added |
| `/free-tools/carousel-builder` | 200 | - | Title added |
| `/product/post-writer` | 200 | - | OK |
| `/product/voice-profile` | 200 | - | OK |
| `/product/hook-generator` | 200 | - | OK |
| `/product/post-scheduler` | 200 | - | OK |
| `/product/agency-workspaces` | 200 | - | OK |
| `/use-cases/founders` | 200 | - | OK |
| `/use-cases/agencies` | 200 | - | OK |
| `/login` | 200 | - | Title added |
| `/signup` | 200 | - | Title added |
| `/forgot-password` | 200 | - | Title added |
| `/legal/terms` | 200 | - | Title fixed |
| `/legal/privacy` | 200 | - | Title fixed |
| `/terms` | 301→/legal/terms | - | Now redirects correctly |
| `/privacy` | 301→/legal/privacy | - | OK |
| `/agency-setup` | 302→/login | Auth | Correct guard |
| `/dashboard` | 302→/login | Auth | Correct guard |
| `/writer` | 302→/login | Auth | Correct guard |
| `/carousels` | 302→/login | Auth | Correct guard |
| `/analytics` | 302→/login | Auth | Correct guard |
| `/calendar` | 302→/login | Auth | Correct guard |
| `/voice` | 302→/login | Auth | Correct guard |
| `/competitors` | 302→/login | Auth | Correct guard |
| `/library` | 302→/login | Auth | Correct guard |
| `/agency` | 302→/login | Auth | Correct guard |
| `/settings` | 302→/login | Auth | Correct guard |
| `/approvals` | 302→/login | Auth | Correct guard |
| `/chat` | 302→/login | Auth | Correct guard |

---

## App (Post-Login) Code Review

All app routes were reviewed at the source level. Full functional testing of the logged-in app requires interactive LinkedIn OAuth (cannot be automated without live credentials). Code review findings:

| Feature | Code Status | Notes |
|---------|-------------|-------|
| Dashboard | Looks correct | Loads stats, recent posts, usage chart via API. Skeleton loading states, error retry buttons all present. |
| Writer | Looks correct | Full 3-step flow: hooks → draft → score. Save/schedule/publish/export all wired. Version history, CTA rewrite, hook alternatives all implemented. |
| Carousel builder | Looks correct | In Writer under Format=Carousel. API enforces monthly limit. Save/copy-text buttons present. |
| Settings | Looks correct | Profile, billing/plan, LinkedIn connect, password change, account delete all implemented. `/plan/status` API call path verified to exist. |
| Auth guard | All pass | Every `app/(app)/*` route server-checks `auth()` and redirects to `/login` if no session. |
| Plan enforcement | Looks correct | `canAccessPlan()`, `getEffectivePlanLimits()`, `LockedFeature` wrapper, `UpgradeModal` all used throughout Writer. |
| Copy-to-clipboard (Writer) | Slight risk | Uses `navigator.clipboard.writeText()` without execCommand fallback (unlike the free hook generator fix). Low risk for production (HTTPS), but may fail in local dev. |

---

## Files Changed

| File | Change |
|------|--------|
| `app/free-tools/viral-checker/page.tsx` | Fixed `improved_version` render crash |
| `components/tools/ViralCheckerTool.tsx` | Fixed same `improved_version` crash |
| `components/tools/HookGeneratorTool.tsx` | Added clipboard fallback |
| `components/ContactForm.tsx` | Added `validateFields()`, per-field inline error messages, `noValidate` |
| `components/Navbar.tsx` | Added localStorage persistence for announcement banner dismiss |
| `app/pricing/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/contact/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/legal/privacy/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/legal/terms/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/terms/page.tsx` | Replaced full page with `redirect("/legal/terms")` |
| `app/agency-setup/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/free-tools/page.tsx` | Removed `\| Qalam`; fixed "$19" → "PKR 1,490"; fixed "7-Day Trial" CTA |
| `app/free-tools/hook-generator/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/free-tools/headline-analyzer/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/free-tools/profile-optimizer/page.tsx` | Removed `\| Qalam` from metadata title |
| `app/blog/[slug]/page.tsx` | Fixed `generateMetadata` title (removed `\| Qalam` to prevent doubling) |
| `app/free-tools/viral-checker/layout.tsx` | **New** — metadata for viral-checker route |
| `app/free-tools/engagement-predictor/layout.tsx` | **New** — metadata for engagement-predictor route |
| `app/free-tools/carousel-builder/layout.tsx` | **New** — metadata for carousel-builder route |
| `app/login/layout.tsx` | **New** — "Sign In" title, noindex |
| `app/signup/layout.tsx` | **New** — "Create Account" title, noindex |
| `app/forgot-password/layout.tsx` | **New** — "Reset Password" title, noindex |
