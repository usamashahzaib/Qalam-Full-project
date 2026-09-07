// Post-specific rules layered on top of lib/prompts/writing-policy.
//
// What used to live here was a numbered list of 18 "CRITICAL RULES - VIOLATION
// = REJECTED OUTPUT" that duplicated the anti-AI block, the positioning block
// and the hook block, and contradicted all three. Rule 10 required every post
// to open with a "pattern interrupt: shock, curiosity, or contrarian take",
// rule 3 banned bullet points outright, and rule 2 banned a list of words
// regardless of context. That is what produced the identical, over-polished
// template. Those rules are gone. Only the genuinely post-specific constraints
// stay, and the shared writing policy carries the rest.

export const POST_TASK_RULES = `
WRITING A LINKEDIN POST:
- One post, one point. Decide what this post is actually for: teaching something the author knows, sharing something that happened or that they believe, or connecting a real problem to what they offer. Then write only that.
- Open with whatever gets to the point fastest for this particular subject. A plain factual first line is a good hook when the fact is interesting. Do not add drama, a contrarian claim, or a cliffhanger that the post does not pay off.
- The close follows the content. Sometimes that is a question, sometimes a next step, sometimes just the last thing worth saying. It is fine to stop without a closing flourish, and never end with a summary of what the reader just read.
- No engagement bait. Never ask readers to comment a keyword, tag someone, or join a pod, and never claim a format guarantees reach, views, or algorithmic distribution.
- Use line breaks so it is readable on a phone. That is a spacing decision, not a requirement that every paragraph be one sentence.
- 0 to 3 precise hashtags on the final line, or none. Never mid-sentence.
`.trim();

