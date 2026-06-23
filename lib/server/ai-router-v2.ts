import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { callGemini } from "./gemini-client"
import { callGroq, type GroqModel } from "./groq-client"
import { callMistral } from "./mistral-client"
import { callCerebras } from "./cerebras-client"
import { callOpenRouter } from "./openrouter-client"
import { createServiceClient } from "./supabase-rest"
import type { OpenAiCompatibleResult } from "./openai-compatible-client"

type AiProvider = "groq" | "gemini" | "mistral" | "cerebras" | "openrouter"
export type AiTask =
  | "post-generation"
  | "competitor-analysis"
  | "hook-generation"
  | "carousel-outline"
  | "voice-profile"
  | "chat-strategist"
  | "post-improvement"
  | "engagement-prediction"
type CallOptions = { json: boolean; temperature: number; maxTokens: number }
type AiResponse = OpenAiCompatibleResult

// ── 1.4: Output sanitizer applied to every provider response ─────────────────
// Normalises typography that slips through despite prompt rules.
export function sanitizeOutput(text: string): string {
  return text
    .replace(/[—–]/g, "-")      // em dash / en dash → plain hyphen
    .replace(/\n{3,}/g, "\n\n") // collapse 3+ blank lines to 2
    .trim()
}

// ── Circuit breaker ──────────────────────────────────────────────────────────
const CIRCUIT_THRESHOLD = 5
const CIRCUIT_OPEN_MS = 5 * 60_000

type ProviderState = {
  calls: number
  successes: number
  failures: number
  rateLimited: number
  consecutiveFailures: number
  openUntil: number
  lastUsed: number
}

const providerState = new Map<AiProvider, ProviderState>()

const defaultState = (): ProviderState => ({
  calls: 0,
  successes: 0,
  failures: 0,
  rateLimited: 0,
  consecutiveFailures: 0,
  openUntil: 0,
  lastUsed: 0,
})

const stateFor = (provider: AiProvider) => providerState.get(provider) ?? defaultState()

const saveState = (provider: AiProvider, patch: Partial<ProviderState>) => {
  const next = { ...stateFor(provider), ...patch }
  providerState.set(provider, next)
  return next
}

const touchProvider = (provider: AiProvider) => {
  const current = stateFor(provider)
  return saveState(provider, { calls: current.calls + 1, lastUsed: Date.now() })
}

const markSuccess = (provider: AiProvider) => {
  const current = stateFor(provider)
  saveState(provider, { successes: current.successes + 1, consecutiveFailures: 0, openUntil: 0 })
}

const markFailure = (provider: AiProvider, rateLimited = false) => {
  const current = stateFor(provider)
  const consecutiveFailures = current.consecutiveFailures + 1
  saveState(provider, {
    failures: current.failures + 1,
    rateLimited: current.rateLimited + (rateLimited ? 1 : 0),
    consecutiveFailures,
    openUntil: consecutiveFailures >= CIRCUIT_THRESHOLD ? Date.now() + CIRCUIT_OPEN_MS : current.openUntil,
  })
}

const isCircuitOpen = (provider: AiProvider) => stateFor(provider).openUntil > Date.now()

// ── 1.5: Transient-error classification ──────────────────────────────────────
// Transient = server-side capacity issue; do NOT count toward circuit breaker.
// Rate-limit = quota exhausted; counts toward circuit but not as hard failure.
// Config error = key / model wrong; skip silently without any failure mark.
function classifyError(msg: string): "transient" | "rate-limit" | "config" | "hard" {
  if (/not configured|api.?key|401|403|expired|api_key_invalid|invalid.?model/i.test(msg)) return "config"
  if (/503|overloaded|capacity|unavailable|service.?unavailable/i.test(msg)) return "transient"
  if (/429|rate.?limit|too many requests|quota/i.test(msg)) return "rate-limit"
  return "hard"
}

// ── Safe JSON extractor (public - used by use-cases) ─────────────────────────
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
        if (escaped) { escaped = false; continue }
        if (char === "\\") { escaped = inString; continue }
        if (char === '"') { inString = !inString; continue }
        if (inString) continue

        if (char === "{" || char === "[") stack.push(char === "{" ? "}" : "]")
        else if (char === "}" || char === "]") {
          if (stack.pop() !== char) break
          if (!stack.length) {
            try {
              const parsed = JSON.parse(cleaned.slice(start, i + 1))
              if (Array.isArray(parsed) && parsed.every((v) => typeof v === "number")) break
              return parsed as T
            } catch { break }
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

// ── Cost table ────────────────────────────────────────────────────────────────
const COST_PER_M: Record<string, { input: number; output: number }> = {
  // Groq
  "llama-3.1-8b-instant":      { input: 0.05,  output: 0.08 },
  "llama-3.3-70b-versatile":   { input: 0.59,  output: 0.79 },
  // Gemini (2.5-flash is stable; pro for quality tasks)
  "gemini-2.5-flash":          { input: 0.15,  output: 0.60 },
  "gemini-2.5-pro":            { input: 1.25,  output: 10.00 },
  // Mistral
  "mistral-small-latest":      { input: 0.10,  output: 0.30 },
  "mistral-medium-2505":       { input: 0.40,  output: 2.00 },
  // Cerebras (dead provider - kept for completeness)
  "gpt-oss-120b":              { input: 0.60,  output: 0.60 },
  // OpenRouter (dead provider - kept for completeness)
  "meta-llama/llama-3.1-8b-instruct": { input: 0.04, output: 0.04 },
  "deepseek/deepseek-chat-v3-0324":   { input: 0.14, output: 0.28 },
}

function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = COST_PER_M[model] ?? { input: 0.10, output: 0.20 }
  return (tokensIn / 1_000_000) * rates.input + (tokensOut / 1_000_000) * rates.output
}

async function logAiUsage(
  userId: string,
  provider: AiProvider,
  model: string,
  tokensIn: number,
  tokensOut: number,
): Promise<void> {
  if (userId === "anonymous") return
  try {
    const supabase = createServiceClient()
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
    if (insertErr && insertErr.code !== "42P01") console.warn("[ai_usage] insert failed:", insertErr.message)
  } catch { void 0 }
}

// ── 1.2: Model mapping per task per provider ──────────────────────────────────
// Cerebras and OpenRouter entries kept so the type is complete, but both providers
// are excluded from providerOrder below and will never be selected in normal flow.
const taskModelMap: Record<AiTask, Record<AiProvider, string>> = {
  "post-generation": {
    mistral:     "mistral-small-latest",
    gemini:      "gemini-2.5-flash",
    groq:        "llama-3.1-8b-instant",
    cerebras:    "gpt-oss-120b",
    openrouter:  "meta-llama/llama-3.1-8b-instruct",
  },
  "competitor-analysis": {
    gemini:      "gemini-2.5-pro",
    groq:        "llama-3.3-70b-versatile",
    mistral:     "mistral-small-latest",
    cerebras:    "gpt-oss-120b",
    openrouter:  "deepseek/deepseek-chat-v3-0324",
  },
  "hook-generation": {
    mistral:     "mistral-small-latest",
    gemini:      "gemini-2.5-flash",
    groq:        "llama-3.1-8b-instant",
    cerebras:    "gpt-oss-120b",
    openrouter:  "meta-llama/llama-3.1-8b-instruct",
  },
  "carousel-outline": {
    mistral:     "mistral-small-latest",
    gemini:      "gemini-2.5-flash",
    groq:        "llama-3.1-8b-instant",
    cerebras:    "gpt-oss-120b",
    openrouter:  "meta-llama/llama-3.1-8b-instruct",
  },
  "voice-profile": {
    mistral:     "mistral-medium-2505",
    gemini:      "gemini-2.5-pro",
    groq:        "llama-3.3-70b-versatile",
    cerebras:    "gpt-oss-120b",
    openrouter:  "deepseek/deepseek-chat-v3-0324",
  },
  "chat-strategist": {
    gemini:      "gemini-2.5-flash",
    mistral:     "mistral-small-latest",
    groq:        "llama-3.1-8b-instant",
    cerebras:    "gpt-oss-120b",
    openrouter:  "meta-llama/llama-3.1-8b-instruct",
  },
  "post-improvement": {
    mistral:     "mistral-small-latest",
    gemini:      "gemini-2.5-pro",
    groq:        "llama-3.3-70b-versatile",
    cerebras:    "gpt-oss-120b",
    openrouter:  "deepseek/deepseek-chat-v3-0324",
  },
  "engagement-prediction": {
    groq:        "llama-3.1-8b-instant",
    gemini:      "gemini-2.5-flash",
    mistral:     "mistral-small-latest",
    cerebras:    "gpt-oss-120b",
    openrouter:  "meta-llama/llama-3.1-8b-instruct",
  },
}

// ── 1.1/1.3: Provider order ───────────────────────────────────────────────────
// Cerebras and OpenRouter removed: Cerebras returns empty content (gpt-oss-120b),
// OpenRouter free models deprecated and paid models are low-quality fallbacks.
// Routing: Mistral PRIMARY (best quality) → Gemini FALLBACK → Groq SPEED ONLY.
// Competitor/chat tasks lead with Gemini which has better reasoning depth.
const providerOrder: Record<AiTask, AiProvider[]> = {
  "post-generation":       ["mistral", "gemini", "groq"],
  "competitor-analysis":   ["gemini", "mistral", "groq"],
  "hook-generation":       ["mistral", "gemini", "groq"],
  "carousel-outline":      ["mistral", "gemini", "groq"],
  "voice-profile":         ["mistral", "gemini", "groq"],
  "chat-strategist":       ["gemini", "mistral", "groq"],
  "post-improvement":      ["mistral", "gemini", "groq"],
  "engagement-prediction": ["groq",   "mistral", "gemini"],
}

// ── 1.6: Retry delays (transient errors only) ─────────────────────────────────
const RETRY_DELAY_MS = [500, 1500, 3000] // 3 attempts: immediate, 0.5s, 1.5s

async function callProvider(
  provider: AiProvider,
  task: AiTask,
  systemPrompt: string,
  userMessage: string,
  options: CallOptions,
  timeout: number,
  userId: string,
  plan: string
): Promise<string | null> {
  if (isCircuitOpen(provider)) return null

  const rateLimit = await checkAiRateLimit(userId, plan, provider)
  if (!rateLimit.allowed) return null

  touchProvider(provider)
  const model = taskModelMap[task][provider]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let result: AiResponse | null = null

      if (provider === "groq") {
        result = await callGroq(systemPrompt, userMessage, { ...options, model: model as GroqModel }, timeout)
      } else if (provider === "gemini") {
        const raw = await callGemini(systemPrompt, userMessage, { ...options, model }, timeout)
        const tokensIn = Math.ceil((systemPrompt.length + userMessage.length) / 4)
        const tokensOut = Math.ceil(raw.length / 4)
        result = { content: raw, tokensIn, tokensOut, model }
      } else if (provider === "mistral") {
        result = await callMistral(systemPrompt, userMessage, { ...options, model }, timeout)
      } else if (provider === "cerebras") {
        result = await callCerebras(systemPrompt, userMessage, { ...options, model }, timeout)
      } else {
        result = await callOpenRouter(systemPrompt, userMessage, { ...options, model }, timeout)
      }

      markSuccess(provider)
      logAiUsage(userId, provider, result.model, result.tokensIn, result.tokensOut)
      return sanitizeOutput(result.content)

    } catch (error) {
      const msg = (error as Error).message || ""
      const kind = classifyError(msg)

      if (kind === "config") {
        // Wrong key / model - no point retrying or marking failure
        console.warn(`[${provider.toUpperCase()}] config error, skipping: ${msg.slice(0, 100)}`)
        return null
      }

      if (kind === "transient") {
        // 1.5: Gemini 503 / capacity spikes - don't count toward circuit, just fall through
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt]))
          continue
        }
        // Exhausted retries for transient - move to next provider without circuit hit
        console.warn(`[${provider.toUpperCase()}] transient failure after ${attempt + 1} attempts`)
        return null
      }

      if (kind === "rate-limit") {
        markFailure(provider, true)
        console.warn(`[${provider.toUpperCase()}] rate limited`)
        return null
      }

      // Hard error - retry up to limit, then mark failure
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt]))
        continue
      }
      markFailure(provider, false)
      console.error(`[${provider.toUpperCase()} Error]`, msg)
      return null
    }
  }

  return null
}

export async function callAi(
  task: AiTask,
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
  } = options

  const promptHash = hashPrompt(systemPrompt, userMessage, { json, temperature, maxTokens })

  if (cache) {
    const cached = await getCachedAiResponse(promptHash)
    if (cached) return cached
  }

  const order = providerOrder[task]
  const callOptions: CallOptions = { json, temperature, maxTokens }

  for (const candidate of order) {
    const content = await callProvider(candidate, task, systemPrompt, userMessage, callOptions, timeout, userId, plan)
    if (content !== null) {
      if (cache) await cacheAiResponse(promptHash, content, cacheTtl)
      return content
    }
  }

  throw new Error("All AI services unavailable. Please try again in a moment.")
}
