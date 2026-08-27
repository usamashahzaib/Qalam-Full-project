# ATS and Signal Match implementation review

## A-B test analysis

No randomized result data exists, so there is no ship, extend, or stop verdict. The implementation establishes the event contract and labels placement comparisons as observational. `docs/EXPERIMENTS.md` records the future sample-size, duration, confidence, sample-ratio, and guardrail requirements.

## Apple design

The change serves safety, agency, responsibility, familiarity, and simplicity. Signal Match stays off while its draft loads. The member can edit every field, sees what supplied the draft, and controls the saved opt-in. The interface adds no ornamental motion.

## Beautiful prose

Visible copy uses direct labels, concrete privacy statements, and short empty states. It avoids filler, reversal pivots, inflated claims, and banned dash characters. The free ATS promise is unchanged.

## Blue ocean strategy

Score: 9/10.

- Eliminate repeated onboarding entry by reusing saved first-party context.
- Reduce account friction by keeping the ATS diagnosis free and available before sign-in.
- Raise trust through editable drafts, fixed analytics tokens, and atomic consent.
- Create a connected path from public diagnosis to evidence-grounded resume work and private professional matching.

The move improves value without adding an AI call to Signal Match onboarding. The remaining adoption gate is production evidence that members understand the source notice and complete the opt-in intentionally.

## Clean code

Score: 9/10.

Pure draft derivation lives in `lib/match-profile-prefill.ts`. ATS marker construction lives in `lib/ats-funnel.ts`. Event properties use one runtime allowlist. Consent publication uses one database transaction. Focused tests cover precedence, privacy, marker continuity, and the event schema.

The remaining point depends on deployed migration verification and browser-level analytics validation in GA4 DebugView.

## Content matrix

The applicable matrix is the match-field source table in `docs/MATCH-DOMAINS.md`. It maps every editable field against Career Vault, workspace profile, and grounded publishing context. Contact email is explicitly excluded from inference.

## Contagious

Raw STEPPS score: 3/12. Mapped score: 4/10.

- Practical value: strong. The free ATS result remains useful before signup.
- Triggers: present. A completed ATS assessment leads naturally to the resume workflow.
- Social currency, emotion, public visibility, and stories: deliberately absent from this private workflow.

The low score is acceptable. Adding public sharing or emotional pressure would conflict with resume privacy and consent.

## Design of Everyday Things

Score: 10/10 against the five-row diagnostic.

- Discoverability: every field has a visible label and example.
- Evaluation: loading, saved, prefilled, empty, success, and failure states are explicit.
- Error recovery: fields remain editable and network failures clear busy state.
- Mapping: controls sit beside the profile they affect.
- Constraints: matching stays off until required topics and audience are present and the opt-in is saved.

## Frontend design taste

Reading: targeted evolution of a trust-sensitive product flow for job seekers, preserving the Qalam system. Dials: variance 3, motion 2, density 5. This skill excludes multi-step product UI, so only its redesign, accessibility, copy, state, contrast, and consistency rules were applied.

## Competitive battlecard

The current Teal comparison is stored in `docs/COMPETITIVE-BATTLECARD-TEAL.md`. It keeps Qalam away from a false volume claim and focuses the implementation on pre-account utility, grounded context, and consent.

## Animation opportunities

The read-only review is stored in `docs/SIGNAL-MATCH-ANIMATION-OPPORTUNITIES.md`. Two restrained opportunities survived the gate. No motion code was changed.
