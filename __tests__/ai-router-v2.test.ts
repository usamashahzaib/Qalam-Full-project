import { describe, expect, it } from "vitest"
import { providerOrder } from "@/lib/server/ai-router-v2"

describe("AI provider routing", () => {
  it.each(Object.keys(providerOrder) as (keyof typeof providerOrder)[])(
    "routes %s to OpenRouter first, then Gemini, then Groq",
    (task) => expect(providerOrder[task]).toEqual(["openrouter", "gemini", "groq"])
  )
})
