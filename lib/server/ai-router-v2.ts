import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"
import { callGemini } from "./gemini-client"
import { createServiceClient } from "./supabase-rest"

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

// Estimated cost per 1M tokens (USD)
const COST_PER_M: Record<string, { input: number; output: number }> = {
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "gemini-1.5-flash": { input: 0.075, output: 0.30 },
}

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_M[model] ?? { input: 0.10, output: 0.20 }
  return (tokensIn / 1_000_000) * rates.input + (tokensOut / 1_000_000) * rates.output
}

// Fire-and-forget: log AI usage to DB for cost monitoring.
// Never throws — cost tracking must never block a generation request.
async function logAiUsage(
  userId: string,
  provider: "groq" | "gemini",
  model: string,
  tokensIn: number,
  tokensOut: number,
): Promise<void> {
  if (userId === "anonymous") return
  try {
    const supabase = createServiceClient()
    // Resolve internal UUID if caller passed external OAuth sub
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .or(`id.eq.${userId},external_user_id.eq.${userId}`)
      .maybeSingle()
    const internalId = userRow?.id
    if (!internalId) return

    const { error: insertErr } = await supabase.from("ai_usage").insert({
      user_id: internalId,
      provider,
      model,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      estimated_cost_usd: estimateCost(model, tokensIn, tokensOut),
    })
    // 42P01 = ai_usage table doesn't exist yet (migration pending) — silent degradation
    if (insertErr && insertErr.code !== "42P01") {
      console.warn("[ai_usage] insert failed:", insertErr.message)
    }
  } catch {
    // Intentionally swallowed — never surface cost tracking errors to users.
  }
}

type AiResponse = { content: string; tokensIn: number; tokensOut: number; model: string }

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  options: { json?: boolean; temperature?: number; maxTokens?: number } = {},
  timeout = 15000
): Promise<AiResponse> {
  const { json = false, temperature = 0.7, maxTokens = 2048 } = options
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error("Groq API key not configured")

  const model = "llama-3.1-8b-instant"

  const response = await withTimeout(
    fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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

  return {
    content,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
    model,
  }
}

// Monthly cost caps (USD) per plan
const MONTHLY_COST_CAP: Record<string, number> = {
  Free: 0.10,
  Solo: 0.50,
  Pro: 2.00,
  Agency: 10.00,
}

async function isOverCostCap(userId: string, plan: string): Promise<boolean> {
  if (userId === "anonymous") return false
  try {
    const supabase = createServiceClient()
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .or(`id.eq.${userId},external_user_id.eq.${userId}`)
      .maybeSingle()
    if (!userRow?.id) return false

    const { data } = await supabase.rpc("get_monthly_ai_cost", { p_user_id: userRow.id })
    const spent = typeof data === "number" ? data : 0
    const planKey = plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase()
    const cap = MONTHLY_COST_CAP[planKey] ?? MONTHLY_COST_CAP.Free
    return spent >= cap
  } catch {
    return false
  }
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
    let result: AiResponse | null = null

    if (provider === "groq") {
      result = await callGroq(systemPrompt, userMessage, options, timeout)
    } else {
      // callGemini returns string; wrap to normalise
      const raw = await callGemini(systemPrompt, userMessage, options, timeout)
      const tokensIn = Math.ceil((systemPrompt.length + userMessage.length) / 4)
      const tokensOut = Math.ceil(raw.length / 4)
      result = { content: raw, tokensIn, tokensOut, model: "gemini-2.5-flash" }
    }

    await recordSuccess(provider)
    // Fire-and-forget cost log — never await
    logAiUsage(userId, provider, result.model, result.tokensIn, result.tokensOut)
    return result.content
  } catch (error) {
    const msg = (error as Error).message || ""
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
    if (cached) return cached
  }

  // Check monthly cost cap before spending tokens
  if (await isOverCostCap(userId, plan)) {
    throw new Error("monthly_ai_cap_reached")
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
