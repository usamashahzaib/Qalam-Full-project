# 001 - Build the Qalam Evidence Field system

- **Status**: COMPLETE
- **Commit**: 3373e4e
- **Severity**: HIGH
- **Category**: Cohesion, purpose, and performance
- **Estimated scope**: 8 files, roughly 180 lines changed

## Problem

Qalam's strongest light marketing background exists only in the homepage hero. It combines a masked grid with teal and gold light, but the current implementation mounts four separate full-section animation layers:

```tsx
/* app/page.tsx:114 - current */
<section className="relative overflow-hidden bg-[#f7f3ea] px-6 pb-20 pt-32 sm:pb-24 sm:pt-40">
  <div className="pointer-events-none absolute inset-0 hero-field opacity-70" aria-hidden />
  <div className="pointer-events-none absolute inset-0 hero-wash" aria-hidden />
  <div className="pointer-events-none absolute inset-0 hidden hero-glow lg:block" aria-hidden />
  <div className="pointer-events-none absolute inset-0 hidden hero-aurora lg:block" aria-hidden />
```

The wash also animates a full-section filter forever. That causes repeated rasterization and gives a purely decorative layer more motion than it needs:

```css
/* app/globals.css:377 - current */
.hero-wash {
  background:
    radial-gradient(ellipse 58% 48% at 10% 26%, oklch(0.9 0.035 168 / 0.62), transparent 70%),
    radial-gradient(ellipse 54% 44% at 90% 80%, oklch(0.93 0.045 88 / 0.55), transparent 72%);
  animation: heroWashDrift 14s ease-in-out infinite;
}
@keyframes heroWashDrift {
  0%, 100% { opacity: 1; filter: hue-rotate(0deg); }
  50%      { opacity: 0.85; filter: hue-rotate(8deg); }
}
```

Other public heroes recreate isolated radial glows and therefore do not share a recognizable background system:

```tsx
/* components/PricingPageContent.tsx:216 - current */
<section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-20">
  <div
    className="pointer-events-none absolute right-0 top-0 h-[500px] w-[500px] rounded-full opacity-15"
    style={{ background: "radial-gradient(circle, rgba(13,74,69,0.25) 0%, transparent 70%)" }}
  />
```

```tsx
/* app/free-tools/page.tsx:132 - current */
<section className="relative overflow-hidden border-b border-zinc-100 bg-white px-6 py-20">
  <div
    className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full opacity-20"
    style={{ background: "radial-gradient(circle, rgba(13,74,69,0.2) 0%, transparent 70%)" }}
  />
  <div
    className="pointer-events-none absolute -bottom-20 -left-10 h-[300px] w-[300px] rounded-full opacity-15"
    style={{ background: "radial-gradient(circle, rgba(201,135,31,0.3) 0%, transparent 70%)" }}
  />
```

Product, use-case, and contact heroes have no field at all:

```tsx
/* app/product/[slug]/page.tsx:87 - current */
<section className="border-b border-zinc-100 bg-white px-6 py-20">
```

```tsx
/* app/use-cases/[slug]/page.tsx:89 - current */
<section className="border-b border-zinc-100 bg-white px-6 py-20">
```

```tsx
/* app/contact/page.tsx:47 - current */
<section className="border-b border-zinc-100 bg-white px-6 py-20">
```

An existing generic component is not suitable for this role. It wraps content in `min-h-screen` and defaults to a black and purple palette:

```tsx
/* components/ui/grid-glow-background.tsx:12 - current */
export default function GridGlowBackground({
  children,
  backgroundColor = "#0a0a0a",
  gridColor = "rgba(255,255,255,0.05)",
  gridSize = 50,
  glowColors = ["#4A00E0", "#8E2DE2", "#4A00E0"],
}: GridGlowBackgroundProps) {
```

Repeating the full homepage stack on every page would make the effect ordinary, add permanent decorative movement, and reduce readability in dense product areas. A constrained three-variant system is needed.

## Target

Create one decorative, content-independent component named `QalamEvidenceField`. It renders behind its parent section and accepts exactly three variants:

- `hero`: cream field for the homepage hero. A static 64px grid and one 14-second glow loop. Only opacity and transform may animate.
- `quiet`: cream-white field for light public page heroes. Static grid and static glows. No animation.
- `cta`: teal field for selected conversion panels. Static light grid and a restrained static gold glow. No animation.

The target component API is:

```tsx
type QalamEvidenceFieldVariant = "hero" | "quiet" | "cta"

interface QalamEvidenceFieldProps {
  variant?: QalamEvidenceFieldVariant
  className?: string
}

export function QalamEvidenceField({
  variant = "quiet",
  className = "",
}: QalamEvidenceFieldProps) {
  return (
    <div
      aria-hidden="true"
      className={`qalam-evidence-field qalam-evidence-field--${variant} ${className}`.trim()}
    >
      <div className="qalam-evidence-field__grid" />
      <div className="qalam-evidence-field__glow" />
    </div>
  )
}
```

The root must be absolute, non-interactive, clipped, and behind content:

```css
.qalam-evidence-field {
  pointer-events: none;
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.qalam-evidence-field__grid,
.qalam-evidence-field__glow {
  position: absolute;
  inset: 0;
}
```

Use these exact light-grid values for `hero` and `quiet`:

```css
.qalam-evidence-field--hero,
.qalam-evidence-field--quiet {
  background: #f7f3ea;
}

.qalam-evidence-field--hero .qalam-evidence-field__grid,
.qalam-evidence-field--quiet .qalam-evidence-field__grid {
  background-image:
    linear-gradient(oklch(0.38 0.05 175 / 0.055) 1px, transparent 1px),
    linear-gradient(90deg, oklch(0.38 0.05 175 / 0.055) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 78% 70% at 50% 42%, #000 34%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 78% 70% at 50% 42%, #000 34%, transparent 100%);
}
```

Use these exact glow values:

```css
.qalam-evidence-field--hero .qalam-evidence-field__glow {
  background:
    radial-gradient(ellipse 58% 48% at 8% 28%, oklch(0.9 0.035 168 / 0.6), transparent 70%),
    radial-gradient(ellipse 52% 44% at 92% 78%, oklch(0.93 0.045 88 / 0.5), transparent 72%);
  animation: qalam-evidence-breathe 14s cubic-bezier(0.77, 0, 0.175, 1) infinite;
  transform-origin: 50% 50%;
}

.qalam-evidence-field--quiet .qalam-evidence-field__glow {
  background:
    radial-gradient(ellipse 46% 44% at 8% 24%, oklch(0.9 0.035 168 / 0.34), transparent 72%),
    radial-gradient(ellipse 42% 38% at 92% 76%, oklch(0.93 0.045 88 / 0.28), transparent 74%);
}

@keyframes qalam-evidence-breathe {
  0%, 100% { opacity: 0.82; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.025); }
}
```

Use these exact dark CTA values:

```css
.qalam-evidence-field--cta {
  background: #0d4a45;
}

.qalam-evidence-field--cta .qalam-evidence-field__grid {
  background-image:
    linear-gradient(rgb(255 255 255 / 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 0.055) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 82% 78% at 50% 50%, #000 24%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 82% 78% at 50% 50%, #000 24%, transparent 100%);
}

.qalam-evidence-field--cta .qalam-evidence-field__glow {
  background:
    radial-gradient(ellipse 46% 58% at 8% 22%, rgb(255 255 255 / 0.09), transparent 72%),
    radial-gradient(ellipse 48% 54% at 94% 82%, rgb(201 135 31 / 0.2), transparent 74%);
}
```

Reduced motion must keep the static field and remove only the ambient breathing:

```css
@media (prefers-reduced-motion: reduce) {
  .qalam-evidence-field--hero .qalam-evidence-field__glow {
    animation: none !important;
    opacity: 0.92;
    transform: none;
  }
}
```

All section content must remain in a `relative z-10` container. The visual field must never capture input or appear in the accessibility tree.

## Repo conventions to follow

- Shared global timing currently uses `cubic-bezier(0.16, 1, 0.3, 1)` and 220ms for interactive controls in `app/globals.css:103`. The evidence loop is ambient, so it deliberately uses the smoother audit curve `cubic-bezier(0.77, 0, 0.175, 1)` rather than the control curve.
- Decorative hero layers already use `pointer-events-none`, `absolute`, `inset-0`, and `aria-hidden` in `app/page.tsx:115`. Preserve those accessibility and stacking conventions.
- Public page content already uses `relative z-10` in `components/PricingPageContent.tsx:221`. Use the same convention on every section receiving the component.
- Use Tailwind for section positioning and spacing. Keep the multi-layer gradients, masks, and keyframes in `app/globals.css`.
- Use a named export from `components/ui/QalamEvidenceField.tsx` and import through `@/components/ui/QalamEvidenceField`.
- Do not use Framer Motion for this ambient background. CSS is sufficient and avoids adding a client boundary.
- Do not add any em dash or en dash characters. The repository pre-commit hook rejects them.

## Steps

1. Create `components/ui/QalamEvidenceField.tsx` with the exact component API and two child layers from the Target section. It must have no `"use client"` directive, no React state, and no animation library import.
2. Add the exact base, `hero`, `quiet`, and `cta` styles to `app/globals.css`. Add `qalam-evidence-breathe` and the explicit reduced-motion override. Animate only opacity and transform.
3. In `app/page.tsx`, import `QalamEvidenceField`, replace the four current decorative divs at lines 115-118 with `<QalamEvidenceField variant="hero" />`, and keep the content wrapper relative. Remove the obsolete `.hero-field`, `.hero-wash`, `.hero-glow`, `.hero-aurora`, and their four keyframe blocks from `app/globals.css` after confirming no references remain with `rg`.
4. In `components/PricingPageContent.tsx`, import the component, replace the hand-coded radial-gradient div at lines 217-220 with `<QalamEvidenceField variant="quiet" />`, and keep the existing content wrapper at `relative z-10`.
5. In `app/free-tools/page.tsx`, import the component and replace both hand-coded hero glow divs at lines 133-140 with `<QalamEvidenceField variant="quiet" />`. Ensure the hero content wrapper is `relative z-10`.
6. In `app/product/[slug]/page.tsx`, import the component. Change the hero section to `relative overflow-hidden border-b border-zinc-100 px-6 py-20`, insert `<QalamEvidenceField variant="quiet" />`, and make its `max-w-[900px]` content wrapper `relative z-10`. Do not change its copy, spacing, or `FadeUp` behavior.
7. In `app/use-cases/[slug]/page.tsx`, make the same quiet-hero change as the product page. Retain the gold eyebrow styling so product and use-case pages remain distinguishable.
8. In `app/contact/page.tsx`, import the component, change only the opening hero section to relative and overflow-hidden, insert `<QalamEvidenceField variant="quiet" />`, and make the centered content wrapper `relative z-10`.
9. Apply the `cta` variant only to two representative conversion panels. In `app/free-tools/page.tsx:217`, replace the existing animated `mesh-blob` div with `<QalamEvidenceField variant="cta" />` and put the CTA copy and controls inside a `relative z-10` wrapper. In `app/product/[slug]/page.tsx:156`, make the teal panel `relative overflow-hidden`, insert `<QalamEvidenceField variant="cta" />`, and wrap its current content in `relative z-10`. Do not apply the CTA field to every teal surface.
10. Remove `components/ui/grid-glow-background.tsx` only after `rg -n "GridGlowBackground|grid-glow-background" app components` confirms it has no consumers. Its dark purple defaults conflict with the new Qalam-specific system.
11. Search for remaining references to the old homepage classes and old CTA mesh blob in the touched areas. The old hero classes must have zero references. Unrelated `mesh-blob` usage outside these two CTA panels stays untouched.

## Boundaries

- Do NOT add this field to `app/(app)`, `components/AppShell.tsx`, dashboards, the writer, editors, tables, pricing cards, blog article bodies, docs, methodology pages, or legal pages.
- Do NOT change `app/about/page.tsx`. Its full dark art direction is intentionally separate.
- Do NOT add parallax, pointer tracking, cursor-reactive light, canvas, WebGL, blur filters, or animated CSS filters.
- Do NOT animate the `quiet` or `cta` variants.
- Do NOT change navbar behavior, pricing plan behavior, form behavior, content, typography, or spacing.
- Do NOT add a dependency or a client component boundary.
- Do NOT restore global scroll reveal behavior or alter `FadeUp`.
- If any target section or component differs materially from commit `3373e4e`, STOP and report the drift instead of improvising.

## Verification

- **Mechanical**:
  - Run `npm run check:dashes`. Expected outcome: exit code 0 with no forbidden dash characters.
  - Run `npx tsc --noEmit`. Expected outcome: exit code 0 with no TypeScript errors.
  - Run `npm run lint`. Expected outcome: exit code 0 with no new lint errors.
  - Run `npm test`. Expected outcome: all existing tests pass.
  - Run `npm run build`. Expected outcome: production build completes successfully.
  - Run `rg -n "hero-field|hero-wash|hero-glow|hero-aurora|GridGlowBackground|grid-glow-background" app components`. Expected outcome: no matches.
- **Feel check**: run `npm run dev`, then inspect `/`, `/pricing`, `/free-tools`, one `/product/[slug]`, one `/use-cases/[slug]`, and `/contact` at 1440px, 768px, and 390px widths. Confirm:
  - The homepage remains the richest version, but only one background layer visibly breathes.
  - Pricing, free tools, product, use-case, and contact heroes share the same visual family without appearing identical to the homepage.
  - Text and interactive controls remain visually above the field and receive pointer input normally.
  - Grid lines remain faint and do not compete with headings, plan cards, or body copy.
  - The two CTA panels use the dark variant and remain clearly readable.
  - Scrolling across page boundaries does not show a hard color seam or a fixed wallpaper effect.
  - In DevTools Performance, record 10 seconds on the homepage. Confirm the evidence field causes no continuous paint from filters and only the glow layer is composited for transform and opacity.
  - In DevTools Animations, set playback to 10 percent and confirm there is no pulse in the grid itself and no visible scale jump at the loop boundary.
  - Toggle `prefers-reduced-motion` in the Rendering panel. Confirm the homepage glow becomes static while the grid and both static light sources remain visible.
- **Done when**: all six selected public heroes use the same component, both representative CTA panels use the `cta` variant, the homepage has only one slow transform-and-opacity loop, dense product areas remain untouched, and all mechanical plus visual checks pass.
