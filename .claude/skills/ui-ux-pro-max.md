# UI UX Pro Max - Design Intelligence Skill

## Core Principles
- **Style:** Premium editorial - a serious, high-trust publishing system. No generic AI-startup gradients or glassmorphism-as-decoration.
- **Typography:** 'Cormorant Garamond' for display/serif accents, 'Plus Jakarta Sans' for body and UI text (see `app/globals.css` `--font-cormorant` / `--font-jakarta`).
- **Colors:**
  - Teal (primary): `#0D4A45` (`--color-teal`, with `-50` through `-900` steps)
  - Gold (accent/CTA): `#C9871F` (`--color-gold`, with `-50` through `-700` steps)
  - Background: warm off-white `#f5f7f6` / `#fafaf8`, not pure white or grey
- **UX Rules:**
  - Motion is restrained and purposeful (loading states, subtle reveals) - never decorative noise.
  - Hover feedback on all interactive elements.
  - Maintain contrast in both light and dark contexts; avoid dark-on-dark text.

## Components Guidelines
- **Hero:** Editorial headline + product/workspace preview mockup, not stock illustration.
- **Buttons:** `rounded-xl`, gold fill for the primary/highlighted action, teal-tinted outline for secondary actions so they still read as clickable next to a highlighted CTA.
- **Cards:** frosted `.qalam-card` / `.content-card` treatment (see `app/globals.css`) for in-app surfaces.

Source of truth for tokens is always `app/globals.css` and `lib/pricing.ts` / `lib/site-content.ts` - if this file and the code disagree, the code wins.
