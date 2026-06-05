# Qalam

Qalam is a premium LinkedIn publishing system.

Product name:
- `Qalam`

Domain:
- `byqalam.com`

This README is the final shareable handoff.
It explains:
- what changed
- why it changed
- what is now real
- what is still mock/demo
- where each concern lives in code

## 1. Final Direction

Qalam is not being positioned as:
- a generic AI writer
- a chatbot with a landing page
- a fake analytics product

Qalam is being positioned as:
- a voice-aware LinkedIn writing system
- a publishing workflow for serious professionals
- a compounding content asset, not a one-off generator

Primary audience:
- founders
- consultants
- operators
- marketing teams
- agencies
- HR leaders

Core product logic:
- train on voice
- preserve drafts and versions
- retain winning hooks and reusable assets
- support scheduling and operational workflow
- create switching cost through memory and archive continuity

## 2. What Was Changed

### A. Brand Correction

Final rule:
- product name = `Qalam`
- public/app domain = `byqalam.com`

Why:
- earlier passes mixed `ByQalam` and `Qalam`
- user clarified the product name is `Qalam`
- domain mismatch is operational, not branding

What changed:
- visible app branding switched to `Qalam`
- footer now explicitly states:
  - `Domain: byqalam.com`
  - `Product: Qalam`
- metadata/schema updated to use `Qalam`

Main files:
- [app/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/layout.tsx)
- [components/Navbar.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Navbar.tsx)
- [components/Footer.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Footer.tsx)
- [app/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/page.tsx)
- [app/login/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/login/page.tsx)
- [app/signup/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/signup/page.tsx)
- [app/dashboard/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/dashboard/page.tsx)
- [app/write/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/write/page.tsx)

Effect:
- no more brand ambiguity
- safer to share publicly
- product/domain distinction is now explicit

### B. Pricing System Unification

Problem before:
- landing, pricing, and CTAs were diverging
- plan descriptions/features were inconsistent

What changed:
- pricing is centralized
- homepage, pricing page, and app CTAs now depend on the same plan source

Source of truth:
- [lib/pricing.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/pricing.ts)

Current plan ladder:
- Free
- Pro
- Team
- Agency

What it controls:
- plan names
- monthly prices
- annual prices
- CTA labels
- plan links
- comparison rows

Downstream surfaces:
- [app/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/page.tsx)
- [app/pricing/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/pricing/page.tsx)
- [app/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/layout.tsx)
- [app/free-tools/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/page.tsx)

Effect:
- pricing edits now propagate cleanly
- lower regression risk
- public pricing is internally coherent

### C. Homepage Rebuild

Problem before:
- dark hero was unreadable
- contrast was fragile
- toy visual language undermined premium positioning
- copy and visuals were not aligned with the product moat

What changed:
- homepage was rebuilt around a lighter editorial hero
- dark hero treatment removed
- contrast hardened
- features/how-it-works/testimonials/pricing preview cleaned up
- hero now presents Qalam as a compounding system, not a generic generator

Main file:
- [app/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/page.tsx)

Effect:
- easier first-read comprehension
- stronger premium feel
- fewer visual failure points

### D. Premium Icon System

Problem before:
- emoji-heavy UI made the product feel cheap
- icons were inconsistent across marketing and app-preview surfaces

What changed:
- created a reusable SVG icon system
- replaced toy/emoji icons on core surfaces

Main file:
- [components/ui/qalam-icons.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/ui/qalam-icons.tsx)

Applied to:
- [components/Navbar.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Navbar.tsx)
- [components/Footer.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Footer.tsx)
- [components/PricingCard.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/PricingCard.tsx)
- [components/TestimonialCard.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/TestimonialCard.tsx)
- [app/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/page.tsx)
- [app/pricing/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/pricing/page.tsx)
- [app/free-tools/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/page.tsx)
- [app/login/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/login/page.tsx)
- [app/signup/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/signup/page.tsx)
- [app/dashboard/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/dashboard/page.tsx)
- [app/write/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/write/page.tsx)

Effect:
- more consistent brand expression
- more premium visual system
- easier future expansion without reverting to emoji

### E. Real Footer / Nav Information Architecture

Problem before:
- footer and nav had fake or weak destinations
- many links just pointed to `/#features`
- public trust layer was shallow

What changed:
- created real route-backed product pages
- created real route-backed use-case pages
- created a real contact page
- footer links now resolve to meaningful destinations

Route-backed product pages:
- `/product/post-writer`
- `/product/voice-profile`
- `/product/hook-generator`
- `/product/post-scheduler`
- `/product/agency-workspaces`

Route-backed use-case pages:
- `/use-cases/founders`
- `/use-cases/marketing-teams`
- `/use-cases/hr-leaders`
- `/use-cases/consultants`
- `/use-cases/agencies`

Contact route:
- `/contact`

Main files:
- [components/Footer.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Footer.tsx)
- [components/Navbar.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Navbar.tsx)
- [app/product/[slug]/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/product/%5Bslug%5D/page.tsx)
- [app/use-cases/[slug]/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/use-cases/%5Bslug%5D/page.tsx)
- [app/contact/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/contact/page.tsx)
- [lib/site-content.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/site-content.ts)

Effect:
- footer is now credible
- better internal linking
- better SEO surface area
- easier to share product/use-case URLs independently

### F. Free Tools Became Real

Problem before:
- free tools were a weak trust surface
- links were dead or underdeveloped

What changed:
- built/kept real route-backed tool pages
- tool index now routes to actual pages

Current free tools:
- `/free-tools/hook-generator`
- `/free-tools/headline-analyzer`
- `/free-tools/profile-optimizer`
- `/free-tools/viral-checker`
- `/free-tools/carousel-builder`
- `/free-tools/engagement-predictor`

Files:
- [app/free-tools/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/page.tsx)
- [app/free-tools/hook-generator/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/hook-generator/page.tsx)
- [app/free-tools/headline-analyzer/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/headline-analyzer/page.tsx)
- [app/free-tools/profile-optimizer/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/profile-optimizer/page.tsx)
- [app/free-tools/viral-checker/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/viral-checker/page.tsx)
- [app/free-tools/carousel-builder/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/carousel-builder/page.tsx)
- [app/free-tools/engagement-predictor/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/free-tools/engagement-predictor/page.tsx)

Important truth note:
- these are mostly heuristic/client-side tools
- they are not pretending to be live analytics systems

Effect:
- stronger top-of-funnel trust
- useful shareable entry points
- better product demonstration

### G. Auth / Dashboard / Writer Shell Upgrade

What changed:
- login/signup cleaned up visually and branded correctly
- dashboard/write upgraded from emoji-heavy shells to more premium preview surfaces
- still intentionally demo-oriented

Files:
- [app/login/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/login/page.tsx)
- [app/signup/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/signup/page.tsx)
- [app/dashboard/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/dashboard/page.tsx)
- [app/write/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/write/page.tsx)

Effect:
- better perceived product quality
- more consistent UI language

### H. Performance Hardening

Primary goal:
- site should feel lightweight
- page should render quickly

Main issue removed:
- global animated canvas background

What changed:
- removed client-side animated canvas background from the shell
- replaced it with static CSS-based background treatment
- enabled response compression and removed `x-powered-by`

Files:
- [components/ui/grid-glow-background.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/ui/grid-glow-background.tsx)
- [next.config.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/next.config.ts)

Effect:
- lower runtime cost
- lower paint/animation overhead
- fewer chances of hero lag or jank

### I. SEO / AEO / GEO / LLMO Hardening

Goal:
- be machine-readable
- be crawlable
- be shareable
- give search engines and LLMs clear canonical information

What changed:
- strengthened root metadata
- improved JSON-LD structure
- expanded sitemap to cover public marketing/product/use-case/tool routes
- improved robots rules
- added `llms.txt`
- added `noindex` layouts for non-marketing app routes

Files:
- [app/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/layout.tsx)
- [app/robots.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/robots.ts)
- [app/sitemap.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/sitemap.ts)
- [app/llms.txt/route.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/llms.txt/route.ts)
- [app/dashboard/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/dashboard/layout.tsx)
- [app/write/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/write/layout.tsx)
- [app/login/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/login/layout.tsx)
- [app/signup/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/signup/layout.tsx)
- [lib/seo.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/seo.ts)

Effect:
- better crawl budget usage
- clearer entity definition
- cleaner public route discovery
- better LLM retrieval friendliness

## 3. Route Map

### Public marketing / company routes

- `/`
- `/pricing`
- `/free-tools`
- `/about`
- `/blog`
- `/contact`
- `/docs`
- `/changelog`
- `/status`
- `/privacy`
- `/terms`
- `/careers`

### Product detail routes

- `/product/post-writer`
- `/product/voice-profile`
- `/product/hook-generator`
- `/product/post-scheduler`
- `/product/agency-workspaces`

### Use-case routes

- `/use-cases/founders`
- `/use-cases/marketing-teams`
- `/use-cases/hr-leaders`
- `/use-cases/consultants`
- `/use-cases/agencies`

### Tool routes

- `/free-tools/hook-generator`
- `/free-tools/headline-analyzer`
- `/free-tools/profile-optimizer`
- `/free-tools/viral-checker`
- `/free-tools/carousel-builder`
- `/free-tools/engagement-predictor`

### App-preview / non-index routes

- `/login`
- `/signup`
- `/dashboard`
- `/write`

These are intentionally marked `noindex`.

## 4. File Ownership Map

| Concern | Source of truth | Effect |
| --- | --- | --- |
| Pricing | [lib/pricing.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/pricing.ts) | landing, pricing page, plan CTAs, pricing logic |
| Product/use-case content | [lib/site-content.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/site-content.ts) | route-backed product/use-case pages |
| SEO route inventory | [lib/seo.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/seo.ts) | sitemap, llms routing, site constants |
| Domain model scaffold | [types/domain.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/types/domain.ts) | future real data model |
| Global metadata/schema | [app/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/layout.tsx) | SEO, OpenGraph, JSON-LD |
| Robots/sitemap/LLM hints | [app/robots.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/robots.ts), [app/sitemap.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/sitemap.ts), [app/llms.txt/route.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/llms.txt/route.ts) | crawl control, discoverability, LLM guidance |
| Shared icon language | [components/ui/qalam-icons.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/ui/qalam-icons.tsx) | premium visual consistency |
| Shared hero/background shell | [components/ui/grid-glow-background.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/ui/grid-glow-background.tsx) | global visual performance |
| Navbar | [components/Navbar.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Navbar.tsx) | top-level navigation |
| Footer | [components/Footer.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Footer.tsx) | trust layer + deep links |
| Homepage positioning | [app/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/page.tsx) | first impression, conversion |
| Pricing page | [app/pricing/page.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/pricing/page.tsx) | plan ladder, conversion |

## 5. What Is Real vs What Is Still Mock

### Real now

- real public routes
- real footer destinations
- real product/use-case pages
- real free-tool routes
- centralized pricing
- shareable metadata/schema/sitemap/robots/llms surface
- buildable frontend

### Still mock/demo

- `dashboard`
- `write`
- auth flows
- voice training persistence
- scheduling persistence
- analytics snapshots
- real approval workflow
- connected account history

These pages are polished previews, not fully wired business logic.

## 6. Domain Model Scaffold

Scaffolded in:
- [types/domain.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/types/domain.ts)

Core objects:
- `UserProfile`
- `VoiceProfile`
- `Post`
- `PostVersion`
- `AnalyticsSnapshot`
- `ContentAsset`
- `ConnectedAccount`
- `Team`
- `ClientWorkspace`
- `ApprovalRequest`

Meaning:
- the repo now has a clear conceptual model for a real moat
- but these types are not yet fully bound to live storage/workflows in this frontend

## 7. Verification

Verified during final pass:
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`

Status:
- passing

## 8. What To Edit If You Change X

If you change pricing:
- edit [lib/pricing.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/pricing.ts)

If you change public crawl/LLM behavior:
- edit [lib/seo.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/lib/seo.ts)
- then check:
  - [app/robots.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/robots.ts)
  - [app/sitemap.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/sitemap.ts)
  - [app/llms.txt/route.ts](/U:/Usama/Qalam/Code/Website/byqalam-website/app/llms.txt/route.ts)

If you change product naming:
- edit [app/layout.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/app/layout.tsx)
- then check navbar/footer/home/pricing/auth pages

If you add a public footer/nav link:
- add the route first
- then update:
  - [components/Navbar.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Navbar.tsx)
  - [components/Footer.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/Footer.tsx)

If you change visual iconography:
- edit [components/ui/qalam-icons.tsx](/U:/Usama/Qalam/Code/Website/byqalam-website/components/ui/qalam-icons.tsx)

If you make claims about memory/learning/analytics:
- make sure the code actually does it
- if not, downgrade the wording

## 9. Recommended Next Technical Priorities

If the next phase is real product implementation, the correct order is:

1. Persist `UserProfile`, `VoiceProfile`, `Post`, and `PostVersion`
2. Make `write` operate on real draft state instead of sample copy
3. Wire scheduling and publishing to actual jobs/events
4. Store `AnalyticsSnapshot` as real historical data
5. Bind `Team` and `ClientWorkspace` to real workflow state
6. Connect approvals to real `ApprovalRequest` objects

## 10. Share Summary

If you need to explain this project to someone quickly:

Qalam was refactored from a visually inconsistent AI-writing landing site into a cleaner, faster, more credible frontend for a premium LinkedIn publishing system. Branding is now correct, pricing is centralized, footer/navigation resolve to real pages, free tools are route-backed, icons are premium, the homepage/pricing are rebuilt for trust, and the technical SEO/AEO/GEO/LLMO layer is now much stronger. The app-preview surfaces still need backend wiring, but the public product shell is now substantially more professional and shareable.
