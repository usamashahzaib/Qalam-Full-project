# Design System

## Design Direction

Warm editorial credibility with product-grade evidence. Teal carries trust and control. Gold marks emphasis. Warm white prevents a generic SaaS feel. Product interfaces, not decorative stock imagery, provide the visual proof.

## Typography

Jakarta is the primary interface and body family. Cormorant is reserved for short editorial emphasis. Body copy remains at least 16 pixels with relaxed line height and constrained measures. Major headings use tight line height and no more than two visual emphasis treatments.

## Tokens

- Spacing scale: 4, 8, 16, 24, 32, 48, 64
- Primary: teal 50 through 900
- Accent: gold 50 through 700
- Surfaces: warm white, white, tinted zinc
- Elevation: subtle cards, raised primary actions, floating overlays only

## Components

| Component | Decision | Status |
|---|---|---|
| Primary CTA | Filled teal, minimum 48 pixel height on marketing surfaces | active |
| Transitional CTA | Outlined or light surface, never equal weight to primary | active |
| Product preview | Real interface framing with clear availability language | active |
| Trust band | Short factual risk reversals, no unsupported logos or claims | active |
| Auth shell | Branded split layout on desktop, compact guardian on mobile, existing auth behavior preserved | active |
| Marketing navigation | Dark on immersive brand surfaces, light on editorial and tool surfaces | active |
| Mobile footer | Native details accordions with 44 pixel summary and link targets | active |

## UX Audit Findings

| Issue | Heuristic | Severity (0-4) | Fix | Status |
|---|---|---:|---|---|
| Multiple equal-weight homepage asks | hierarchy | 3 | one direct CTA and one lower-commitment tool CTA | shipped |
| Roadmap content interrupted purchase evaluation | relevance | 2 | move roadmap detail away from homepage | shipped |
| Referral promotion targeted existing users inside prospect journey | match to user intent | 2 | remove from homepage | shipped |
| Raw color values remain fragmented | consistency | 2 | consolidate semantic tokens after inventory and contrast automation | backlog |
| Auth pages felt detached from the premium brand | aesthetic and trust | 3 | introduce the Qalam auth shell and password privacy interaction | shipped |
| Light product pages inherited a heavy dark navigation frame | visual continuity | 2 | select a route-aware light navigation treatment | shipped |
| Mobile footer exposed every navigation link at once | information density | 2 | use collapsed native accordions on small screens | shipped |
| Several inline links were shorter than the touch target baseline | accessibility | 3 | give conversion and contact links a minimum 44 pixel interactive height | shipped |
| Daily dashboard used proof banking, signal bank, rhythm, and momentum for one simple action | match to real language | 4 | use Today&apos;s Win, Your Week, Recent Wins, and Progress | shipped |
| Dashboard progress looked clinical and visually flat | hierarchy and emotional design | 3 | make the daily action dominant, move progress into a rich supporting panel, and add a 13-part progress map | shipped |
| A missed day could feel like failure | user control and recovery | 3 | state that saved work remains and let the user continue without repair pressure | shipped |
| Generated career outputs and carousel decks could not always be removed where they appeared | user control and freedom | 4 | add a shared confirmation dialog plus visible delete actions in libraries and editors | shipped |
| Carousel deletion was hidden until pointer hover and unavailable as a clear mobile action | accessibility and discoverability | 3 | keep the action visible, touch-friendly, and keyboard operable | shipped |

## Microinteraction Inventory

| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| Primary CTA | hover lift, focus ring, press feedback, reduced-motion safe | preserve | active |
| Capability tabs | click and keyboard arrows update preview | preserve | active |
| Scroll reveals | run once and respect reduced motion | verify in browser tests | active |
| ATS assessment | submit locks, progress copy changes, result scores appear together | preserve input on error and announce completion | active |
| Writer generation | immediate busy state followed by draft and score feedback | keep motion under 250 milliseconds and respect reduced motion | active |
| Contact link | visible underline and 44 pixel mobile target | preserve | active |
| Save today's win | button responds immediately, saves once, confirms reusable value, then presents the next useful move | implemented | active |
| Delete generated output | visible action opens a focused confirmation dialog, supports Escape, reports failure inline, and removes the item after success | implemented | active |

## Motion Principles

1. Motion explains state change, hierarchy, or continuity. Decorative motion is omitted.
2. Direct manipulation feedback begins immediately. Enter and exit transitions stay between 120 and 250 milliseconds.
3. Use opacity and transforms for routine transitions. Avoid layout animation on text-heavy pages.
4. Reduced-motion users receive the same information without travel, parallax, or repeated reveal effects.
5. The signature moment is a completed proof artifact appearing with its score and next action, not a generic celebration.
