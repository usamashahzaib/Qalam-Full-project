import "server-only"

import Anthropic from "@anthropic-ai/sdk"
import type { OpenAiCompatibleResult } from "./openai-compatible-client"

type Effort = "low" | "medium" | "high"

// One client per instance. The router owns retries and fallbacks, so the SDK's own retries are off.
let client: Anthropic | null = null
const getClient = () => (client ??= new Anthropic({ maxRetries: 0 }))

const readEffort = (): Effort => {
  const value = process.env.ANTHROPIC_EFFORT
  return value === "medium" || value === "high" ? value : "low"
}

export async function callAnthropic(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; maxTokens?: number; model: string },
  timeout = 40000
): Promise<OpenAiCompatibleResult> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured")

  const { json = false, maxTokens = 2048, model } = options
  // Thinking is adaptive by default on current models and spends from max_tokens, so the
  // caller's budget (sized for the visible answer) gets headroom. Sampling parameters are
  // left out because current models reject non-default temperature.
  const system = json
    ? `${systemPrompt}\n\nRespond with the JSON object only. No prose before or after it, no code fences.`
    : systemPrompt

  let response: Anthropic.Message
  try {
    response = await getClient().messages.create(
      {
        model,
        max_tokens: Math.max(maxTokens * 4, 8000),
        system,
        messages: [{ role: "user", content: userMessage }],
        output_config: { effort: readEffort() },
      },
      { timeout }
    )
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      // The router classifies failures by message text, so lead with the status and type.
      throw new Error(`Anthropic ${error.status ?? ""} ${error.type ?? ""}: ${error.message}`)
    }
    throw error
  }

  if (response.stop_reason === "refusal") throw new Error("Anthropic content filtered (refusal)")

  const content = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim()
  if (!content) throw new Error(`Anthropic returned empty response (stop_reason=${response.stop_reason})`)

  return {
    content,
    tokensIn: response.usage.input_tokens,
    tokensOut: response.usage.output_tokens,
    model: response.model,
  }
}
