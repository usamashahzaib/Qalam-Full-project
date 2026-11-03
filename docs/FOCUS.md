# Where Qalam is focused

Qalam is a LinkedIn writer for one person who wants posts that sound like them. Everything else is paused until that works and people come back to it.

This file is the short version of the current state. The older plans live in `docs/archive/` and describe a bigger product than the one shipping now.

## What is live

- **Interview-first writer.** After a topic, the writer asks up to three questions (a real moment, a real number, what the field gets wrong). The answers travel as `story` into hooks, the post and the score check. Code: `lib/interview.ts`, `app/api/generate/interview/route.ts`.
- **Voice training on every plan.** Paste 3 to 5 of your own posts, analyze, save. Only the voice passport (several client voices) stays Pro and Agency. Code: `lib/server/voice-profile.ts`.
- **Learning from edits.** Saving a post stores the AI version in `posts.metadata.aiDraft`. The two newest real edits go into the next draft. Code: `lib/server/draft-edits.ts`.
- **Carousels.** A finished post becomes slides that use only what the post says. Slides export as a 4:5 PDF with an accent colour and a footer. Layout checks and the grounding check run on every deck. Code: `lib/carousel-deck.ts`, `app/api/generate/carousel/route.ts`.

## What is paused

Career, Agency, AI Strategist chat, Competitor research, and the engagement predictor and viral checker tools. Pages redirect, their APIs return 404, and links, sitemap, `llms.txt` and pricing leave them out. The map is `lib/frozen-surfaces.ts`.

Bring a surface back by setting `NEXT_PUBLIC_UNFROZEN_SURFACES` to a comma list (`career,agency`) or `all`, then redeploy. The test suite runs with `all` so paused code keeps working.

Do not add features to paused surfaces and do not link to them from marketing pages.

## AI providers

Signed-in writing tries providers in this order and moves on when one is missing, busy or out of quota:

1. Anthropic (Sonnet writes, Haiku scores). Needs `ANTHROPIC_API_KEY`. Paid.
2. NVIDIA API catalog, a chain of free open models. Needs `NVIDIA_API_KEY`.
3. Gemini, then Groq.

Anonymous free tools use Gemini, Groq and OpenRouter free models only. They never reach Anthropic or NVIDIA.

`npm run check:nvidia` sends one prompt to every model in the NVIDIA chains and prints which ones answer. Run it after the catalog changes.

**NVIDIA's free endpoints are for development and testing.** NVIDIA's own NIM FAQ says production use, meaning serving real end users, needs an NVIDIA AI Enterprise license. Use the NVIDIA key locally. Before real users write through the product, set `ANTHROPIC_API_KEY` or another paid key, and leave `NVIDIA_API_KEY` unset in production.

Check the terms of any free tier before launch for two things: whether production use is allowed, and whether prompts may be used for training.

## Before launch

- Set `ANTHROPIC_API_KEY` in production, and confirm the prices in `COST_PER_M` (`lib/server/ai-router-v2.ts`). The daily spend cap is only as accurate as that table.
- Set `INDEXNOW_KEY` in Vercel. Without it `/api/cron/indexnow` returns 503. Any stable random string works: `node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"`.
- Run `npm run check:migrations` against production.
- Smoke test on staging with a real account: interview, hooks, post, score, save, schedule, carousel PDF, voice analysis. Then check one carousel PDF opens and reads well in LinkedIn's document viewer.
- Check Lemon Squeezy for active Agency subscribers or Career add-on buyers. Pausing those surfaces turns them away.

## Not done yet

- Pricing rewrite (a lower Pro price was suggested). That includes whether carousel PDF export should stay Pro-only: a Free user can build a carousel but not download it.
- Carousel brand kit is stored per browser, not per account. Moving it to the database needs a migration.
- The carousel PDF uses standard fonts, so it covers Latin-script text only.
- Saved carousels opened in Carousel Studio still export square. The writer export is the 4:5 one.
