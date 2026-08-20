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

## Microinteraction Inventory

| Interaction | Trigger/Rules/Feedback/Loops | Fix | Status |
|---|---|---|---|
| Primary CTA | hover lift, focus ring, press feedback, reduced-motion safe | preserve | active |
| Capability tabs | click and keyboard arrows update preview | preserve | active |
| Scroll reveals | run once and respect reduced motion | verify in browser tests | active |
