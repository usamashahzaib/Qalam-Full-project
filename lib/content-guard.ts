export const AI_BANNED_TERMS = [
  "as we navigate",
  "rapidly evolving landscape",
  "future belongs",
  "unlock the full potential",
  "transformative technology",
  "game-changer",
  "delve",
  "leverage",
  "foster",
  "it is worth noting",
  "in conclusion",
]

export const sanitizeGeneratedText = (value: string) =>
  value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\*\*/g, "")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*(title|introduction|problem|solution|call to action|hashtags):\s*/gim, "")
    .replace(/\bAI-powered\b/g, "AI")
    .replace(/\n{3,}/g, "\n\n")
    .trim()

export const hasAiSlop = (value: string) => {
  const lower = value.toLowerCase()
  return AI_BANNED_TERMS.some((term) => lower.includes(term))
}

export const cleanErrorMessage = (message = "") => {
  const lower = message.toLowerCase()
  if (lower.includes("json") || lower.includes("failed_generation") || lower.includes("groq") || lower.includes("schema")) {
    return "Could not generate a clean draft. Try a more specific topic."
  }
  if (lower.includes("rate limit")) return "Too many requests. Try again in a minute."
  if (lower.includes("auth")) return "Please sign in again."
  return message || "Something went wrong. Try again."
}

export const fallbackHooks = (content: string, title = "") => {
  const topic = (title || content.split(/\n/).find(Boolean) || "this topic").replace(/[^\w\s-]/g, "").trim().slice(0, 48) || "this topic"
  return [
    { style: "Sharp", text: `Most teams are handling ${topic} too late.` },
    { style: "Authority", text: "After seeing this up close, one pattern keeps repeating." },
    { style: "Story", text: `I used to think ${topic} was simple. It is not.` },
    { style: "Curiosity", text: `The quiet mistake behind ${topic} is easy to miss.` },
    { style: "Direct", text: `Here is the practical way to think about ${topic}.` },
  ].map((hook) => ({ ...hook, text: sanitizeGeneratedText(hook.text).slice(0, 100) }))
}
