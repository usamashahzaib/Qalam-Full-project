# Match domains

`lib/matching.ts` is the shared matching engine. It is deliberately free of database,
network, and product assumptions: it takes normalised participants, applies an optional
hard eligibility gate, scores the remaining pool, and returns ranked results with human
readable reasons.

One domain ships today. A second is planned. This document records what is shared, what
is not, and the reasoning behind the split, so the second domain does not get built by
widening the first one.

## Domain 1: professional (shipped)

Surface: `/career/match` inside Qalam.
Tables: `match_profiles`, `match_suggestions`, `match_connections`, all with `domain = 'professional'`.
Consent: `career_consents.purpose = 'peer_matching'`.

Attributes: `industry`, `seniority`, `location`, `expertise[]`, `audience[]`, `goals[]`.

Scoring is entirely soft. There are no disqualifiers, because a bad professional pairing
is not harmful, it is just useless, and a low score already handles that. The rules live
in `scorePair` and are summarised here:

| Signal | Weight | Why |
| --- | --- | --- |
| Candidate expertise intersects viewer audience | up to +30 | Strongest signal. The person you write for is more valuable than the person like you. |
| Viewer expertise intersects candidate audience | up to +20 | Same signal, other direction. Scored separately because the pair is not symmetric. |
| Same industry | +18 | Shared context, shared vocabulary. |
| Same industry, low expertise overlap | +12 | Adjacent specialisms are complementary. |
| Shared goals | +10 | Same year, same intent. |
| Same location | +8 | Makes an actual meeting possible. |
| Seniority within one rung | +8 | Peer conversation rather than a pitch. |
| Expertise Jaccard above 0.7 | -15 | Competing for identical attention. |
| Seniority gap of three rungs or more | -10 | Becomes a favour request, not a peer match. |

## Domain 2: matrimonial (not built)

**This must not live inside Qalam.** Not a brand preference, a structural one. Qalam's
recruiter surfaces (`candidate_visibility`, `career_organizations`, the verified recruiter
search) rest on the promise that the profile is employer facing. Putting marriage data in
the same product, and the same database, breaks that promise in both directions: nobody
puts marriage data on an employer facing profile, and no employer treats a product that
holds it as a serious hiring surface.

Correct shape: a separate Next.js application, separate Supabase project, separate domain,
that depends on the matching engine as a package or a copied module. The only thing shared
is `lib/matching.ts`. No shared tables, no shared auth, no shared pool.

### What the engine already supports

- `SelectOptions.disqualify` is the hard eligibility gate this domain needs.
- `connectionPair` and the ordered `match_connections` shape work unchanged.
- `periodStart` works unchanged if the domain also uses a weekly cadence.
- Double opt-in before contact reveal works unchanged, and matters more here.

### What has to be different

**1. Two stage pipeline, not one.**

Professional matching is a single soft score. Matrimonial matching is a hard filter
followed by a soft score. The hard filter is not a heavy negative weight. A candidate who
fails an absolute constraint must be unreachable, not merely unlikely, because a high
score on every other axis must never be able to outvote it. That is exactly what
`disqualify` is for.

Hard filters (all supplied by the searching side, all absolute):

- Gender, and the gender being sought
- Marital status the searcher will consider
- Age band the searcher will consider, checked in both directions
- Religion, and sect where the searcher specifies one
- Country, and city where the searcher restricts it
- Willingness to relocate, where the pair is cross city
- Caste or community, only where the searcher has stated it as a requirement

**2. Different attribute set.**

`expertise` and `audience` have no meaning here. The profile splits into three tiers with
different visibility rules, which the professional domain does not need:

- *Filterable*: the hard filter fields above. Visible in a match card.
- *Descriptive*: education, profession, family setup, languages, practising level, values,
  what the person is looking for. Visible in a match card.
- *Protected*: full name, photographs, phone number, exact address, family contact.
  Never in a match card. Released only after mutual interest, and photographs should be
  separately gated so a user can require a second explicit release for them.

**3. Family and guardian involvement is a first class feature, not a workaround.**

For the Pakistan market a large share of profiles are created and managed by a parent,
sibling, or guardian rather than the candidate. That is a schema requirement, not a
setting: a profile needs a `managed_by` relationship and an audit of who acted, and the
introduction flow needs to work when the person answering is not the person being matched.
Retrofitting this later means rewriting the consent trail.

**4. Safety obligations the professional domain does not carry.**

- Report and block, with block applied as a `disqualify` rule in both directions and
  permanently, not per period.
- No free text between parties before mutual interest. The professional domain gets away
  with no messaging at all; here the absence of a pre match message channel is a safety
  control, not a scope cut.
- Photograph release as a separate consent event with its own timestamp.
- Identity verification tier on the profile, shown honestly. An unverified profile must
  be labelled unverified, never left ambiguous.
- Deletion must remove protected fields immediately, not on a batch schedule.

**5. Soft scoring rules are different in kind.**

Professional matching rewards complementary difference. Matrimonial matching mostly
rewards alignment, with a small number of complementarity signals. Indicative weights,
to be tuned against real outcomes rather than shipped as truth:

| Signal | Direction |
| --- | --- |
| Stated preferences satisfied on both sides | strong positive, and count both directions separately |
| Practising level and values alignment | strong positive |
| Education band within one step | moderate positive |
| Same city, or both willing to relocate | moderate positive |
| Language overlap | moderate positive |
| Family setup expectation alignment | moderate positive |
| Age gap inside the band but near its edge | mild negative |
| Only one side has stated a requirement the other cannot meet | disqualify, never a penalty |

### Cold start

The professional domain avoids the two sided cold start because both sides of a match are
existing Qalam users. The matrimonial domain has no such gift: it starts with an empty pool
and both sides are the same side, so density is the only thing that matters at launch.
Plan for a seeded, geographically narrow launch, one city, and refuse to show a match card
until the pool can produce one honestly. A visible empty state is survivable. A padded pool
is not.

### Reuse checklist

When starting domain 2, take:

- `lib/matching.ts` entire file
- `selectMatches`, `scorePair` structure, replacing the rule body
- the `match_suggestions` and `match_connections` table shapes
- the double opt in flow in `lib/server/matching.ts`

Do not take:

- `match_profiles` column set
- `career_consents` (build a domain specific consent table with its own purposes)
- the Qalam auth session or workspace model
- anything under `app/(app)/career`
