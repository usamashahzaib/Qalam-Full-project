# Qalam

Qalam is a LinkedIn writing and publishing system with voice memory, approvals, analytics, and multi-client agency workflows. The product is `Qalam`; `byqalam.com` is the domain.

Project rules for AI coding tools live in `CLAUDE.md` and `AGENTS.md`. Read them before changing code.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (`app/globals.css`)
- Auth: NextAuth v5 (credentials and LinkedIn sign-in)
- Data: Supabase Postgres with RLS, migrations in `supabase/migrations`
- Jobs and limits: Upstash Redis, QStash, Vercel Cron (`vercel.json`)
- AI: Groq, Gemini, Mistral, Cerebras, OpenRouter behind a daily spend cap
- Payments: Lemon Squeezy (USD store)
- Email: Resend
- Monitoring: Sentry
- Browser extension: `extension/`

## Getting started

```bash
npm install          # also installs the git hooks
cp .env.example .env.local
npm run dev
```

Fill `.env.local` from `.env.example`. Without Supabase, AI, and LinkedIn credentials, the marketing site renders but app features will fail.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build. `prebuild` blocks the build if any local migration is not applied to the configured database |
| `npm run typecheck` | Regenerates route types, then runs `tsc` |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit and integration tests (`__tests__/`) |
| `npx playwright test` | Browser tests (`tests/`) |
| `npm run check:dashes` | Blocks em and en dashes (also runs as a pre-commit hook) |
| `npm run check:rls` | Audits database RLS policies and grants |
| `npm run check:migrations` | Verifies every local migration is applied |
| `npm run eval:prompts` | Prompt contract evals |

## Repo map

| Path | What lives there |
| --- | --- |
| `app/` | Marketing pages, SEO landing pages, free tools, legal, blog |
| `app/(app)/` | Signed-in app: writer, library, calendar, analytics, approvals, voice, carousels, career, agency, desk, passport |
| `app/connect`, `app/drop`, `app/proof`, `app/pitch` | Client-facing token pages for agencies (no Qalam account needed) |
| `app/api/` | Route handlers, including webhooks and cron jobs |
| `app/admin/` | Platform admin area |
| `components/` | Shared UI, app shell, agency components |
| `lib/` | Business logic, prompts, pricing, SEO content |
| `lib/server/` | Server-only helpers: auth, workspace, LinkedIn, payments, Supabase, agency |
| `proxy.ts` | Host routing, route protection, security headers |
| `supabase/migrations/` | Database schema history |
| `docs/` | Product, positioning, design, and audit documents |
| `scripts/` | Readiness checks, git hooks, evals |

## Sources of truth

| Concern | File |
| --- | --- |
| Plans, prices, plan features | `lib/pricing.ts` |
| Career add-on catalog | `lib/career-pricing.ts` |
| Product and use-case copy | `lib/site-content.ts` |
| SEO constants and route inventory | `lib/seo.ts` |
| Global metadata and JSON-LD | `app/layout.tsx` |
| Protected app routes | `lib/protected-routes.ts` |
| Domain types | `types/domain.ts` |

## Product truth rules

- Never fake customer logos, ratings, analytics, or integrations.
- Any claim about memory, learning, or analytics must be backed by code that does it. If it is not, downgrade the wording.
- Prices on the site must match what Lemon Squeezy actually charges.
