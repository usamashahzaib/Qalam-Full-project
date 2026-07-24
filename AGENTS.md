<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No em dashes or en dashes, anywhere

Never write an em dash or en dash in this repo - not in code, comments, commit messages, UI copy, docs, or SQL. Use a plain hyphen (`-`) or split into two sentences. This applies no matter which AI tool or model is generating the change.

A pre-commit hook (`scripts/check-no-dashes.mjs`, wired via `.githooks/pre-commit`) blocks any commit containing these characters, so don't rely on it catching things after the fact - write hyphens from the start. The only exceptions are a handful of allowlisted lines where the literal character is the functional payload (a regex that strips these dashes at runtime, and AI prompt strings that show the model the exact character to avoid) - see the `ALLOWED` set in that script before touching those files.

## Imported Claude Cowork project instructions
