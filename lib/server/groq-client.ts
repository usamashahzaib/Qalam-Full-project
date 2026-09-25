import "server-only"

import { callOpenAiCompatible } from "./openai-compatible-client"

export type GroqModel = "openai/gpt-oss-20b" | "openai/gpt-oss-120b"

export async function callGroq(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: GroqModel } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "openai/gpt-oss-20b" } = options
  return callOpenAiCompatible({
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    apiKey: process.env.GROQ_API_KEY,
    model,
    provider: "Groq",
    systemPrompt,
    userMessage,
    json,
    temperature,
    maxTokens,
    timeout,
    // gpt-oss reasons at "medium" by default and spends the whole max_tokens
    // budget thinking: a 1000-token post call came back with 998 reasoning
    // tokens and an empty message, and scoring hit the cap before closing its
    // JSON. "low" leaves the budget for the actual output.
    body: { reasoning_effort: "low" },
  })
}
