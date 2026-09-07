# Writing evaluation

Two harnesses. One runs anywhere, one needs credentials and money.

## `npm run eval:prompts`

Offline. No network, no keys, no cost. Builds the prompt for all 28 cases in
`cases.ts` and checks what the model is allowed to see and what it is being
asked for: does the whole source post reach it, is the author's voice present at
every step, are the template mandates gone, is the pasted post framed as data.

Writes `output/prompt-contract.md`.

This says nothing about writing quality. It cannot. It is a regression net for
the plumbing.

## `npm run eval:live`

Calls a real provider for every case, under the current prompt and under a
frozen copy of the prompt as it was before this change (`baseline-prompts.ts`).

    QALAM_EVAL_LIVE=1 GROQ_API_KEY=... npm run eval:live

Optional: `QALAM_EVAL_REPEATS` (default 3, repeats reveal recurring templates),
`QALAM_EVAL_MODEL` (default `openai/gpt-oss-20b`, matching what the
`chat-strategist` task routes to in production).

Writes into `output/`:

- `blinded.md` - each case's two outputs as arm A and arm B, shuffled per case.
  Read and rate this first.
- `blinded-key.json` - which arm was which. Open after rating, not before.
- `metrics.json` - per-output proxy measurements.
- `summary.md` - aggregates per arm.

## How to read the results

The five dimensions are scored separately and must stay separate. A comment can
be flawlessly grounded and completely irrelevant to the post it replies to, and
one averaged number hides exactly that.

1. Source relevance
2. Factual grounding
3. Voice fidelity
4. Natural phrasing
5. Variation

`graders.ts` computes proxies for these. Every one of them is a proxy. They can
show that something regressed across many cases at once, and they can point you
at the outputs worth reading. They cannot tell you the writing is good. The
blinded human ratings are the result; the metrics are triage.

There is no AI-detector score here and there should not be one. A detector score
is not evidence of human quality, and neither is the product's own content
score, which is produced by the same class of model that wrote the text.

## Adding a case

Add to `COMMENT_CASES` or `POST_CASES` in `cases.ts`. Write the `probe` field as
the specific failure the case is there to catch. `sourceAnchors` are terms a
genuine reply should engage with, `tailAnchors` are anchors that appear only
late in a long post, and `forbiddenClaims` are things the model must not assert
about the author.
