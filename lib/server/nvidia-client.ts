import "server-only"

import { callOpenAiCompatible } from "./openai-compatible-client"

// NVIDIA's API catalog (build.nvidia.com) serves open models free on a developer key.
// NVIDIA's terms allow that for development and testing only. Serving real users needs an
// NVIDIA AI Enterprise license, so production should run on a paid key before launch.
//
// Each task gets a chain of models, as a comma-separated list. A busy or retired model hands
// over to the next one before the router leaves NVIDIA altogether. The catalog changes, so
// check what is live with GET https://integrate.api.nvidia.com/v1/models or run
// `npm run check:nvidia`.
export const NVIDIA_WRITING_MODELS = "moonshotai/kimi-k2.6,nvidia/nemotron-3-ultra-550b-a55b,mistralai/mistral-large-4-1t-a52b,z-ai/glm-5.3-flash"
export const NVIDIA_READING_MODELS = "deepseek-ai/deepseek-v4.1-flash,nvidia/nemotron-3-super-120b-a12b,z-ai/glm-5.3-flash"

// Worth trying the next model: throttled, missing from the catalog, overloaded, or an empty answer.
const NEXT_MODEL = /429|rate.?limit|404|not.?found|503|overloaded|unavailable|returned empty response|Timeout after/i

// Reasoning models can put their thinking inline before the answer.
const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()

export async function callNvidia(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number; model: string },
  timeout = 30000
) {
  const { json = false, temperature = 0.7, maxTokens = 2048, model } = options
  const candidates = model.split(",").map((m) => m.trim()).filter(Boolean)
  let lastError: unknown = new Error("NVIDIA model not configured")

  for (const candidate of candidates) {
    try {
      const result = await callOpenAiCompatible({
        endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
        apiKey: process.env.NVIDIA_API_KEY,
        model: candidate,
        provider: "NVIDIA",
        systemPrompt,
        userMessage,
        json,
        temperature,
        maxTokens,
        timeout,
      })
      const content = stripThinking(result.content)
      if (!content) throw new Error("NVIDIA returned empty response")
      return { ...result, content }
    } catch (error) {
      lastError = error
      if (!NEXT_MODEL.test((error as Error).message)) throw error
    }
  }

  throw lastError
}
