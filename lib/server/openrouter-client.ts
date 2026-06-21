import { callOpenAiCompatible } from "./openai-compatible-client"

export async function callOpenRouter(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: string } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "~openai/gpt-latest" } = options
  return callOpenAiCompatible({
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: process.env.OPENROUTER_API_KEY,
    model,
    provider: "OpenRouter",
    systemPrompt,
    userMessage,
    json,
    temperature,
    maxTokens,
    timeout,
    headers: {
      "HTTP-Referer": process.env.FRONTEND_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-OpenRouter-Title": "Qalam",
    },
  })
}
