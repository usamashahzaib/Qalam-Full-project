import { describe, expect, it } from "vitest"
import { providerOrder } from "@/lib/server/ai-router-v2"

describe("AI provider routing", () => {
  it.each(["hook-generation", "cta-rewrite"] as const)(
    "routes %s to Gemini with direct Groq fallback",
    (task) => expect(providerOrder[task].slice(0, 2)).toEqual(["gemini", "groq"])
  )

  it.each(["post-generation", "post-scoring", "post-improvement", "carousel-outline"] as const)(
    "routes %s to Groq with direct Gemini fallback",
    (task) => expect(providerOrder[task].slice(0, 2)).toEqual(["groq", "gemini"])
  )
})
