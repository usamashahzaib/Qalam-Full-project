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
        if (char === '"') {
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

// Cost per 1M tokens - updated with correct model names
const COST_PER_M: Record<string, { input: number; output: number }> = {
  // Groq
  "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
  "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
  // Gemini
  "gemini-2.5-flash-lite-preview": { input: 0.075, output: 0.30 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 10.00 },
  // Mistral
  "mistral-small-3": { input: 0.10, output: 0.30 },
  "mistral-medium-3": { input: 0.40, output: 2.00 },
  // Cerebras
  "llama-3.3-70b": { input: 0.50, output: 0.50 },
  "llama-4-scout": { input: 0.50, output: 0.50 },
  // OpenRouter (using underlying model costs)
  "meta-llama/llama-3.1-8b-instruct:free": { input: 0, output: 0 },
  "deepseek/deepseek-chat-v3-0324:free": { input: 0, output: 0 },
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
  } catch {
    void 0
  }
}

// Model mapping per task per provider
const taskModelMap: Record<AiTask, Record<AiProvider, string>> = {
  "post-generation": {
    groq: "llama-3.1-8b-instant",
    gemini: "gemini-2.5-flash-lite-preview",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  },
  "competitor-analysis": {
    groq: "llama-3.3-70b-versatile",
    gemini: "gemini-2.5-pro",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "deepseek/deepseek-chat-v3-0324:free",
  },
  "hook-generation": {
    groq: "llama-3.1-8b-instant",
    gemini: "gemini-2.5-flash-lite-preview",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  },
  "carousel-outline": {
    groq: "llama-3.1-8b-instant",
    gemini: "gemini-2.5-flash-lite-preview",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  },
  "voice-profile": {
    groq: "llama-3.3-70b-versatile",
    gemini: "gemini-2.5-pro",
    mistral: "mistral-medium-3",
    cerebras: "llama-3.3-70b",
    openrouter: "deepseek/deepseek-chat-v3-0324:free",
  },
  "chat-strategist": {
    groq: "llama-3.1-8b-instant",
    gemini: "gemini-2.5-flash-lite-preview",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  },
  "post-improvement": {
    groq: "llama-3.3-70b-versatile",
    gemini: "gemini-2.5-pro",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "deepseek/deepseek-chat-v3-0324:free",
  },
  "engagement-prediction": {
    groq: "llama-3.1-8b-instant",
    gemini: "gemini-2.5-flash-lite-preview",
    mistral: "mistral-small-3",
    cerebras: "llama-3.3-70b",
    openrouter: "meta-llama/llama-3.1-8b-instruct:free",
  },
}

// Provider priority per task - optimized for free tier limits and model strengths
const providerOrder: Record<AiTask, AiProvider[]> = {
  "post-generation":     ["groq", "gemini", "cerebras", "mistral", "openrouter"],
  "competitor-analysis": ["groq", "gemini", "cerebras", "mistral", "openrouter"],
  "hook-generation":     ["mistral", "groq", "gemini", "cerebras", "openrouter"],
  "carousel-outline":    ["groq", "gemini", "cerebras", "mistral", "openrouter"],
  "voice-profile":       ["gemini", "groq", "mistral", "cerebras", "openrouter"],
  "chat-strategist":     ["gemini", "groq", "mistral", "cerebras", "openrouter"],
  "post-improvement":    ["gemini", "groq", "mistral", "cerebras", "openrouter"],
  "engagement-prediction": ["groq", "gemini", "cerebras", "mistral", "openrouter"],
}

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
    return result.content
  } catch (error) {
    const msg = (error as Error).message || ""
    const rateLimited = /429|rate limit|too many requests/i.test(msg)
    const isConfigError = /not configured|API key|401|403|expired|API_KEY_INVALID/i.test(msg)
    if (!isConfigError) markFailure(provider, rateLimited)
    console.error(`[${provider.toUpperCase()} Error]`, msg)
    return null
  }
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