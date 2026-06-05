@AGENTS.md

# Qalam Project Context

## Product
- Product name: `Qalam`
- Domain/brand URL: `byqalam.com`
- Category: premium SaaS for LinkedIn publishing, voice memory, analytics, and agency/client workflows
- Positioning: not a generic AI writer; should feel like a serious paid authority/publishing system

## Stack
- Framework: `Next.js 16` App Router
- UI: `React 19`
- Styling: `Tailwind CSS v4` via `app/globals.css`
- Motion: `framer-motion`
- Language: `TypeScript`

## Repo Shape
- `app/`
  - marketing pages: landing, pricing, about, blog, docs, contact, legal
  - app routes: `app/(app)/*`
  - auth routes: `app/(auth)/*`
  - API routes: `app/api/*`
  - SEO routes: `app/robots.ts`, `app/sitemap.ts`, `app/llms.txt/route.ts`
- `components/`
  - shared site UI: navbar, footer, cards, icons
  - app providers/auth/workspace wrappers
- `lib/`
  - `pricing.ts`: pricing source of truth
  - `site-content.ts`: product/use-case route content
  - `seo.ts`: metadata/route SEO constants
  - `server/*`: env, auth session, LinkedIn, Supabase REST helpers
- `types/`
  - `domain.ts`: core product/domain model types

## Source Of Truth Files
- Pricing/plans/features: `lib/pricing.ts`
- Product/use-case copy objects: `lib/site-content.ts`
- SEO/site metadata constants: `lib/seo.ts`
- Domain model: `types/domain.ts`
- Global shell/JSON-LD: `app/layout.tsx`

## Product Truth Constraints
- Do not fake customer logos, ratings, analytics, or live integrations
- Do not present mock UI as real backend capability without clear truth
- `Qalam` is the product name; `byqalam.com` is the domain, not the product rename
- Keep copy premium, calm, high-trust; avoid toy SaaS language

## Current Reality
- Marketing site is real and route-backed
- Free tool pages exist as acquisition surfaces
- SEO/AEO/GEO/LLMO scaffolding exists
- App surfaces under `app/(app)` are still partly scaffold/demo-oriented unless explicitly wired to backend routes
- LinkedIn/Supabase/server helpers exist in `app/api/*` and `lib/server/*`

## UX / Design Rules
- Prefer premium SVG icons over emoji
- Avoid dark-on-dark or low-contrast text
- Keep page weight low; avoid expensive background FX or heavy client JS unless justified
- Motion should be restrained and purposeful, not decorative noise
- Preserve editorial/premium feel; no generic purple AI-startup aesthetic

## Coding Conventions
- Read relevant Next.js docs in `node_modules/next/dist/docs/` before touching framework-specific behavior
- Use `apply_patch` for manual edits
- Prefer existing patterns/files over inventing parallel systems
- Keep changes token-efficient and implementation-tight
- Don’t commit local logs or machine-specific config files

## Good Starting Checks For Any Session
- Read `README.md`
- Inspect `app/layout.tsx`
- Inspect `lib/pricing.ts`, `lib/site-content.ts`, `lib/seo.ts`
- Run `git status`
- Confirm whether task is marketing-site work or app/backend work
