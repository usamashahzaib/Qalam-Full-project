import { describe, expect, it } from "vitest"
import { providerOrder, providersFor } from "@/lib/server/ai-router-v2"

describe("AI provider routing", () => {
  it.each(Object.keys(providerOrder) as (keyof typeof providerOrder)[])(
    "routes %s to Claude first, then Gemini, Groq and OpenRouter",
    (task) => expect(providerOrder[task]).toEqual(["anthropic", "gemini", "groq", "openrouter"])
  )

  it("keeps signed-in users off the free OpenRouter models", () => {
    expect(providersFor("post-generation", "user-123")).toEqual(["anthropic", "gemini", "groq"])
  })

  it("keeps anonymous free-tool traffic off Claude", () => {
    expect(providersFor("hook-generation", "free_203.0.113.7")).toEqual(["gemini", "groq", "openrouter"])
    expect(providersFor("hook-generation", "anonymous")).toEqual(["gemini", "groq", "openrouter"])
  })
})
