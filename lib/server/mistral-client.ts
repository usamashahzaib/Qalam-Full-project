import { callOpenAiCompatible } from "./openai-compatible-client"

export async function callMistral(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: string } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "mistral-small-latest" } = options
  return callOpenAiCompatible({
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    apiKey: process.env.MISTRAL_API_KEY,
    model,
    provider: "Mistral",
    systemPrompt,
    userMessage,
    json,
    temperature,
    maxTokens,
    timeout,
  })
}
