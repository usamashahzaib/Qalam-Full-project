// Objective text cleanup applied to model output before it reaches a user.
//
// What is deliberately NOT here any more:
//
// - AI_BANNED_TERMS / hasAiSlop(). A substring blacklist flagged "leverage" and
//   "foster" in any context, which is wrong ("we leverage the existing index"
//   is a normal sentence) and, more importantly, useless: generate-post.ts
//   logged the finding and shipped the draft anyway. Judgment about phrasing
//   now lives in the task prompts, and objective checks live in
//   lib/prompts/output-checks.ts where each defect carries a repair
//   instruction.
//
// - fallbackHooks(). It returned canned lines including "After seeing this up
//   close, one pattern keeps repeating" and "I used to think X was simple",
//   both of which assert personal experience the user never claimed. Nothing
//   imported it, so it shipped no fabricated text, but a fallback that invents
//   a lived experience must not exist where someone can wire it up later. When
//   a provider fails, the caller returns an error. It does not substitute
//   generic content.

export const sanitizeGeneratedText = (value: string) =>
  value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*(title|introduction|problem|solution|call to action|hashtags):\s*/gim, "")
    .replace(/\bAI-powered\b/g, "AI")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

export const cleanErrorMessage = (message = "") => {
  const lower = message.toLowerCase()
  if (lower.includes("json") || lower.includes("failed_generation") || lower.includes("groq") || lower.includes("schema")) {
    return "Could not generate a clean draft. Try a more specific topic."
  }
  if (lower.includes("rate limit")) return "Too many requests. Try again in a minute."
  if (lower.includes("auth")) return "Please sign in again."
  return message || "Something went wrong. Try again."
}
