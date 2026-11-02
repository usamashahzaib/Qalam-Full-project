import "server-only"

import { callOpenAiCompatible } from "./openai-compatible-client"

// NVIDIA's API catalog (build.nvidia.com) serves open models for free on a developer key.
// The catalog changes, so the models are env-configurable. List what is live with
// GET https://integrate.api.nvidia.com/v1/models
export async function callNvidia(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model: string },
  timeout = 30000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model } = options
  return callOpenAiCompatible({
    endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
    apiKey: process.env.NVIDIA_API_KEY,
    model,
    provider: "NVIDIA",
    systemPrompt,
    userMessage,
    json,
    temperature,
    maxTokens,
    timeout,
  })
}
