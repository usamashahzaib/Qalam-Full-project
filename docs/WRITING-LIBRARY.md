# Writing library and quality review

This implements permissioned reference retrieval and a dataset preparation workflow. It does not train or deploy a model. No dataset has been imported and no improvement in live writing quality has been measured yet.

## Setup

1. Apply `supabase/migrations/20260914183000_writing_reference_library.sql` through the normal database migration process. It enables pgvector if needed. Use a database role allowed to install the extension.
2. Set `GEMINI_API_KEY` for embeddings. Both private voice retrieval and library imports use `gemini-embedding-001`, normalized to 768 dimensions. Do not change embedding models without re-embedding stored documents.
3. Open `/admin/writing-library` with an existing admin account. The admin dashboard links to it.
4. Add reviewed, permissioned examples. Record the original brief, supplied facts, original draft, final version, editor notes, source, and permission evidence. Do not paste private client material without separate permission for the selected uses. Permission must cover processing by the configured model provider too.
5. Once the reference library has been reviewed, set `WRITING_REFERENCE_LIBRARY_ENABLED=true` and restart the server. The default is off. Empty libraries and provider failures leave normal generation available.

The interface supports one reviewed entry at a time. This is a curation workflow, not a bulk scraper. Language, audience, industry, and purpose are embedded with each reference. Country is supplied metadata only and is never inferred. Retrieval can apply an exact language filter; current post routes rely on the request topic and brief for multilingual relevance and do not infer a country.

## Privacy and eligibility

- Shared references are a separate table with row level security and service-role-only access. Admin routes check the admin session. Regular workspace users cannot read or write the library.
- Private voice examples stay scoped to the current workspace. There is no cross-workspace import or automatic learning from client edits.
- Reference use and training permission are separate checkboxes. Both default to unchecked.
- Expired and revoked permissions are excluded from retrieval and export. Remove an example to delete its stored content and embedding. Remove earlier exported copies too. Removing a source cannot undo a completed training run or recall drafts already generated from it.
- Reuse one stable private author code for the same person, including across agencies and imports. Hashing assigns all of their examples to train or held-out test. Approximately 20 percent of author codes go to test; a small dataset may not have both sets yet.
- Exact normalized original and final duplicates are rejected. Editors must still check paraphrases and near duplicates. Do not use edited copies of test material in training.
- Only training-split references may be retrieved. Test examples never feed production reference selection.

## What changes in generation

Private voice retrieval now ranks available embeddings by cosine similarity and falls back to multilingual keyword matching when embeddings are unavailable. Queries use `RETRIEVAL_QUERY`; documents use `RETRIEVAL_DOCUMENT`. Older examples without embeddings keep working and receive embeddings when the voice examples are saved again.

Fresh post generation through both post use cases can add up to three shared references above a 0.55 cosine similarity threshold. References are marked as third-party writing, not personal facts or voice evidence. Replacing a hook on an existing draft does not add shared references. The similarity threshold is a starting setting, not a validated quality boundary. Evaluate it on held-out topics before rollout.

## Training exports

Use the two export buttons. They produce JSONL messages with the shared writing policy, original brief, supplied facts, and editor-approved response. Editor notes and original drafts remain in the library for review but are not claimed to be user inputs. Only rows with current training permission are exported. Exports fail rather than silently truncate above 10,000 records.

Keep each export with a dated record of its permissions and model configuration. The export is a supervised chat dataset; validate it against the chosen provider's format and current model support before uploading. No provider upload, fine-tuning job, ongoing scheduler, or model switch is configured here. Those steps require an eligible dataset and a selected training provider/model.

## Blind evaluation

Use fresh briefs from held-out authors and topics. Generate baseline and candidate drafts with identical supplied facts and voice context. Do not give the test answer to either model. Prepare a JSON array with `id`, `brief`, `facts`, `baseline`, and `candidate`. Include the supplied voice context in the brief so the reviewer can judge voice match.

Run:

```sh
node scripts/writing-blind-eval.mjs prepare cases.json evaluation-output
```

Give the reviewer only `review.json`. Keep `answer-key.json` hidden. The reviewer chooses A, B, or tie, explains why, counts unsupported factual claims, scores voice from 1 to 5, and records editing time. Then run:

```sh
node scripts/writing-blind-eval.mjs score evaluation-output/review.json evaluation-output/answer-key.json
```

The report compares wins, factual errors, voice scores, and editing time. Missing scores, duplicate IDs, and changed comparison text fail validation. Review results by language and audience as well as overall. Set acceptance criteria before reviewing; do not deploy a candidate on win count alone when factual errors increase. This tool reports human judgments, not an AI detector score.

The workflow can run repeatedly as editors add approved material. Recurring training is not active and no claim of training on millions of posts is supported by this implementation.
