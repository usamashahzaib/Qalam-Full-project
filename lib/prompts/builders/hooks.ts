// Hook-specific rules layered on top of lib/prompts/writing-policy.
//
// The previous version required every hook to be a "pattern interrupt: shock,
// curiosity, or contrarian take" with an "emotional trigger: fear, hope,
// anger, curiosity", banned ending on a question mark, and asked for something
// that "sounds like a human wrote it at 2am after breakthrough". Between them
// those rules guaranteed five variations of the same overwrought sentence.

export const HOOK_TASK_RULES = `
WRITING AN OPENING LINE:
- The job of an opening line is to make the subject worth reading about. Being specific usually does that on its own. Drama is one option among several, not the requirement.
- Concrete beats clever. A real detail, a named situation, or a plain statement of the actual point will outperform a manufactured tease.
- Numbers, employers, clients, dates and outcomes only when the author supplied them. A hook is the easiest place to fabricate credibility, so do not.
- Keep it to one or two sentences and short enough to survive the mobile truncation, roughly 150 characters. Going a little over is better than cutting the substance out.
- A question can be an opening line when it is a real question. Do not force one, and do not add a question mark to a statement.
- Each variant is a different way into the subject, not the same sentence with different adjectives.
`.trim();

