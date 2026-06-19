import { callOpenAiCompatible } from "./openai-compatible-client"

export async function callCerebras(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: string } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "gpt-oss-120b" } = options
  return callOpenAiCompatible({
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    apiKey: process.env.CEREBRAS_API_KEY,
    model,
    provider: "Cerebras",
    systemPrompt,
    userMessage,
    json,
    temperature,
    maxTokens,
    timeout,
  })
}
