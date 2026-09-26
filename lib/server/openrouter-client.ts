import "server-only"

import { callOpenAiCompatible } from "./openai-compatible-client"

const FREE_CHAT_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "stealth/space-bunny-alpha",
]

export async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: string } = {},
  timeout = 30000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "openrouter/free" } = options
  const candidates = model === "openrouter/free" ? FREE_CHAT_MODELS : [model]
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      return await callOpenAiCompatible({
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY,
        model: candidate,
        provider: "OpenRouter",
        systemPrompt,
        userMessage,
        json,
        temperature,
        maxTokens,
        timeout,
        headers: {
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Qalam",
        },
      })
    } catch (error) {
      lastError = error
      if (!/429|rate.?limit|returned empty response/i.test((error as Error).message)) throw error
    }
  }

  throw lastError
}
