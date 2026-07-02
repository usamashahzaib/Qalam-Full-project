import "server-only"

import { callOpenAiCompatible } from "./openai-compatible-client"

export type GroqModel = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile"

export async function callGroq(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model?: GroqModel } = {},
  timeout = 15000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model = "llama-3.1-8b-instant" } = options
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
  })
}