import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"
import { callGemini } from "./gemini-client"

// Strips markdown fences and returns the first plausible JSON object/array.
export function safeParseJson<T = unknown>(raw: string): T | null {
  try {
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
    try { return JSON.parse(cleaned) as T } catch { /* fall through */ }

    for (let start = 0; start < cleaned.length; start++) {
      const first = cleaned[start]
      if (first !== "{" && first !== "[") continue

      const stack = [first === "{" ? "}" : "]"]
      let inString = false, escaped = false

      for (let i = start + 1; i < cleaned.length; i++) {
        const char = cleaned[i]
        if (escaped) {
          escaped = false
          continue
        }
        if (char === "\\") {
          escaped = inString
          continue
        }
        if (char === "\"") {
          inString = !inString
          continue
        }
        if (inString) continue

        if (char === "{" || char === "[") stack.push(char === "{" ? "}" : "]")
        else if (char === "}" || char === "]") {
          if (stack.pop() !== char) break
          if (!stack.length) {
            try {
              const parsed = JSON.parse(cleaned.slice(start, i + 1))
              if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) break
              return parsed as T
            } catch {
              break
            }
          }
        }
      }
    }
    console.warn("[safeParseJson] Could not extract JSON from AI response", { preview: raw.slice(0, 120) })
    return null
  } catch (err) {
    console.warn("[safeParseJson] Unexpected parse error", err)
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    ),
  ])
}

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number } = {},
  timeout = 15000
): Promise<string> {
  const { json = false, temperature = 0.7, maxTokens = 2048 } = options
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key not configured")

  const response = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: json ? { type: "json_object" } : undefined,
      }),
    }),
    timeout
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error")
    throw new Error(`Groq API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ""
  if (!content) throw new Error("Groq returned empty response")
  return content
}

type CallOptions = { json: boolean; temperature: number; maxTokens: number }

async function attemptProvider(
  provider: "groq" | "gemini",
  systemPrompt: string,
  userMessage: string,
  options: CallOptions,
  timeout: number,
  userId: string,
  plan: string
): Promise<string | null> {
  const [rateLimit, circuitAvailable] = await Promise.all([
    checkAiRateLimit(userId, plan, provider),
    checkCircuit(provider),
  ])

  if (!circuitAvailable || !rateLimit.allowed) return null

  try {
    const result = provider === "groq"
      ? await callGroq(systemPrompt, userMessage, options, timeout)
      : await callGemini(systemPrompt, userMessage, options, timeout)
    await recordSuccess(provider)
    return result
  } catch (error) {
    const msg = (error as Error).message || ""
    // Auth/config errors are permanent misconfigurations, not transient failures — don't trip circuit
    const isConfigError = /not configured|API key|401|403|expired|API_KEY_INVALID/i.test(msg)
    if (!isConfigError) await recordFailure(provider)
    console.error(`[${provider.toUpperCase()} Error]`, msg)
    return null
  }
}

export async function callAi(
  systemPrompt: string,
  userMessage: string,
  options: {
    json?: boolean
    temperature?: number
    timeout?: number
    maxTokens?: number
    userId?: string
    plan?: string
    cache?: boolean
    cacheTtl?: number
    // "groq" = Groq primary, Gemini fallback (content, scoring, improvements, carousels)
    // "gemini" = Gemini primary, Groq fallback (hooks, hook alternatives, CTA rewrite)
    provider?: "groq" | "gemini"
  } = {}
) {
  const {
    json = false,
    temperature = 0.7,
    timeout = 20000,
    maxTokens = 2048,
    userId = "anonymous",
    plan = "free",
    cache = true,
    cacheTtl = 86400,
    provider = "groq",
  } = options

  const promptHash = hashPrompt(systemPrompt, userMessage, { json, temperature, maxTokens })

  if (cache) {
    const cached = await getCachedAiResponse(promptHash)
    if (cached) {
      return cached
    }
  }

  const primary = provider
  const secondary: "groq" | "gemini" = provider === "groq" ? "gemini" : "groq"
  const callOptions: CallOptions = { json, temperature, maxTokens }

  const primaryResult = await attemptProvider(primary, systemPrompt, userMessage, callOptions, timeout, userId, plan)
  if (primaryResult !== null) {
    if (cache) await cacheAiResponse(promptHash, primaryResult, cacheTtl)
    return primaryResult
  }

  const secondaryResult = await attemptProvider(secondary, systemPrompt, userMessage, callOptions, timeout, userId, plan)
  if (secondaryResult !== null) {
    if (cache) await cacheAiResponse(promptHash, secondaryResult, cacheTtl)
    return secondaryResult
  }

  throw new Error("All AI services unavailable. Please try again in a moment.")
}
