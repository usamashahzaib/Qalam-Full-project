import "server-only"

import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { callGemini } from "./gemini-client"
import { callGroq, type GroqModel } from "./groq-client"
import { callMistral } from "./mistral-client"
import { createServiceClient, sanitizeOrFilterValue } from "./supabase-rest"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"
import { log } from "./logging"
import { env } from "./env"
import type { OpenAiCompatibleResult } from "./openai-compatible-client"

export type AiProvider = "groq" | "gemini" | "mistral"
export type AiTask =
  | "post-generation"
  | "post-scoring"
  | "competitor-analysis"
  | "hook-generation"
  | "cta-rewrite"
  | "carousel-outline"
  | "voice-profile"
  | "chat-strategist"
  | "post-improvement"
  | "engagement-prediction"
type CallOptions = { json: boolean; temperature: number; maxTokens: number }
type AiResponse = OpenAiCompatibleResult

// ── 1.4: Output sanitizer applied to every provider response ─────────────────
// Normalises typography and strips AI-tell phrases that slip through prompts.
export function sanitizeOutput(text: string): string {
  return text
    // ── Typography ─────────────────────────────────────────────────────────────
    .replace(/[—–]/g, "-")
    // ── Standalone AI-validation sentences (whole line = just the phrase) ─────
    // These add zero meaning and are a dead giveaway of AI authorship.
    .replace(
      /^[ \t]*(?:this framing is (?:right|correct|wrong)|the problem is real|this(?: part)? is real|i'?ve seen this(?: firsthand)?)[\.\!\?]?\s*$/gim,
      ""
    )
    // ── Sentence-start transitional filler ─────────────────────────────────────
    // Strip the phrase AND capitalize the word it exposes in one pass, so
    // recapitalization only ever touches the exact spot we just edited - never
    // a blanket pass over the whole output, which would otherwise mangle any
    // sentence that legitimately starts lowercase-then-capital (iPhone, eBay).
    .replace(
      /(^|[.!?]\s+|\n)(?:needless to say|suffice it to say|without further ado|make no mistake|let me be (?:clear|honest)|here'?s the thing|at the end of the day|that being said|having said that|it goes without saying that)[,:\s]+([a-z])/gi,
      (_match, prefix: string, letter: string) => prefix + letter.toUpperCase()
    )
    // ── Same fillers mid-sentence ────────────────────────────────────────────
    // No sentence-start capitalization needed here - just remove.
    .replace(
      /\b(?:needless to say|suffice it to say|without further ado|make no mistake|let me be (?:clear|honest)|here'?s the thing|at the end of the day|that being said|having said that)[,:\s]+/gi,
      ""
    )
    .replace(/\bit goes without saying that\s+/gi, "")
    // ── Whitespace ─────────────────────────────────────────────────────────────
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ── Circuit breaker (Redis-backed, shared across all serverless instances) ────
// Delegates to ./circuit-breaker.ts which uses Upstash Redis so that open/closed
// state is consistent regardless of which instance handles the request.

// ── 1.5: Transient-error classification ──────────────────────────────────────
// Transient = server-side capacity issue; do NOT count toward circuit breaker.
// Rate-limit = quota exhausted; counts toward circuit but not as hard failure.
// Config error = key / model wrong; skip silently without any failure mark.
function classifyError(msg: string): "transient" | "rate-limit" | "config" | "filtered" | "hard" {
  if (/not configured|api.?key|401|403|expired|api_key_invalid|invalid.?model/i.test(msg)) return "config"
  if (/503|overloaded|capacity|unavailable|service.?unavailable/i.test(msg)) return "transient"
  if (/429|rate.?limit|too many requests|quota/i.test(msg)) return "rate-limit"
  if (/content filtered|SAFETY|RECITATION|PROHIBITED/i.test(msg)) return "filtered"
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
    log.warn("ai.safe_parse_json_failed", { preview: raw.slice(0, 120) })
    return null
  } catch (err) {
    log.warn("ai.safe_parse_json_error", { error: (err as Error).message })
    return null
  }
}

// ── Cost table ────────────────────────────────────────────────────────────────
const COST_PER_M: Record<string, { input: number; output: number }> = {
  "llama-3.1-8b-instant":    { input: 0.05,  output: 0.08 },
  "llama-3.3-70b-versatile": { input: 0.59,  output: 0.79 },
  "gemini-2.5-flash":        { input: 0.15,  output: 0.60 },
  "gemini-2.5-pro":          { input: 1.25,  output: 10.00 },
  "mistral-small-latest":    { input: 0.10,  output: 0.30 },
  "mistral-medium-2505":     { input: 0.40,  output: 2.00 },
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
    // Free-tools routes pass userId as `free_${ip}` where ip is a request
    // header value - sanitize before it reaches the .or() filter string (see
    // sanitizeOrFilterValue) since this is the one caller of this pattern
    // where the value isn't already a session/DB-derived internal id.
    const safeId = sanitizeOrFilterValue(userId)
    const { data: userRow } = await supabase
      .from("users")
      .select("id")
      .or(`id.eq.${safeId},external_user_id.eq.${safeId}`)
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
    if (insertErr && insertErr.code !== "42P01") log.warn("ai_usage.insert_failed", { error: insertErr.message })
  } catch { void 0 }
}

// ── Daily spend cap ────────────────────────────────────────────────────────
// Global (all-users) aggregate, checked once per SPEND_CACHE_TTL_MS window so
// every AI call doesn't hit the DB. AI_DAILY_SPEND_CAP_USD=0 (unset) disables
// the cap entirely - existing behavior, no enforcement.
const SPEND_CACHE_TTL_MS = 60_000
let spendCache: { day: string; totalUsd: number; checkedAt: number } | null = null
let alertedForDay: string | null = null
let lastExceededLogAt = 0

async function getDailySpendUsd(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  if (spendCache && spendCache.day === today && Date.now() - spendCache.checkedAt < SPEND_CACHE_TTL_MS) {
    return spendCache.totalUsd
  }
  const supabase = createServiceClient()
  const { data, error } = await supabase.rpc("get_daily_ai_cost")
  const totalUsd = error ? 0 : Number(data) || 0
  spendCache = { day: today, totalUsd, checkedAt: Date.now() }
  return totalUsd
}

async function enforceDailySpendCap(): Promise<void> {
  if (env.aiDailySpendCapUsd <= 0) return
  const today = new Date().toISOString().slice(0, 10)
  const spentUsd = await getDailySpendUsd()
  const ratio = spentUsd / env.aiDailySpendCapUsd

  if (ratio >= 1) {
    if (Date.now() - lastExceededLogAt > SPEND_CACHE_TTL_MS) {
      lastExceededLogAt = Date.now()
      log.error("ai.daily_spend_cap_exceeded", { spentUsd, capUsd: env.aiDailySpendCapUsd })
    }
    throw new Error("AI daily spend cap reached. Please try again later.")
  }

  if (ratio >= 0.8 && alertedForDay !== today) {
    alertedForDay = today
    log.error("ai.daily_spend_cap_alert_80pct", { spentUsd, capUsd: env.aiDailySpendCapUsd })
  }
}

// ── 1.2: Model mapping per task per provider ──────────────────────────────────
const taskModelMap: Record<AiTask, Record<AiProvider, string>> = {
  "post-generation":       { mistral: "mistral-small-latest", gemini: "gemini-2.5-flash",  groq: "llama-3.1-8b-instant" },
  "post-scoring":          { mistral: "mistral-small-latest", gemini: "gemini-2.5-flash",  groq: "llama-3.3-70b-versatile" },
  "competitor-analysis":   { gemini:  "gemini-2.5-pro",       groq:   "llama-3.3-70b-versatile", mistral: "mistral-small-latest" },
  "hook-generation":       { gemini: "gemini-2.5-flash", groq: "llama-3.1-8b-instant", mistral: "mistral-small-latest" },
  "cta-rewrite":           { gemini: "gemini-2.5-flash", groq: "llama-3.1-8b-instant", mistral: "mistral-small-latest" },
  "carousel-outline":      { mistral: "mistral-small-latest", gemini: "gemini-2.5-flash",  groq: "llama-3.1-8b-instant" },
  "voice-profile":         { mistral: "mistral-medium-2505",  gemini: "gemini-2.5-pro",    groq: "llama-3.3-70b-versatile" },
  "chat-strategist":       { gemini:  "gemini-2.5-flash",     mistral: "mistral-small-latest", groq: "llama-3.1-8b-instant" },
  "post-improvement":      { mistral: "mistral-small-latest", gemini: "gemini-2.5-pro",    groq: "llama-3.3-70b-versatile" },
  "engagement-prediction": { groq:    "llama-3.1-8b-instant", gemini: "gemini-2.5-flash",  mistral: "mistral-small-latest" },
}

// ── 1.1/1.3: Provider order ───────────────────────────────────────────────────
// Routing is task-specific. Hooks and CTA lead with Gemini.
// Posts, scoring, improvements, and carousels lead with Groq.
export const providerOrder: Record<AiTask, AiProvider[]> = {
  "post-generation":       ["groq",    "gemini", "mistral"],
  "post-scoring":          ["groq",    "gemini", "mistral"],
  "competitor-analysis":   ["gemini",  "mistral", "groq"],
  "hook-generation":       ["gemini",  "groq",    "mistral"],
  "cta-rewrite":           ["gemini",  "groq",    "mistral"],
  "carousel-outline":      ["groq",    "gemini",  "mistral"],
  "voice-profile":         ["mistral", "gemini", "groq"],
  "chat-strategist":       ["gemini",  "mistral", "groq"],
  "post-improvement":      ["groq",    "gemini",  "mistral"],
  "engagement-prediction": ["groq",    "mistral", "gemini"],
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
  const circuitClosed = await checkCircuit(provider)
  if (!circuitClosed) return null

  const rateLimit = await checkAiRateLimit(userId, plan, provider)
  if (!rateLimit.allowed) return null

  const model = taskModelMap[task][provider]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      let result: AiResponse | null = null

      if (provider === "groq") {
        result = await callGroq(systemPrompt, userMessage, { ...options, model: model as GroqModel }, timeout)
      } else if (provider === "gemini") {
        const raw = await callGemini(systemPrompt, userMessage, { ...options, model }, timeout)
        // Use byte length for non-Latin text (Arabic/Urdu/CJK use 2-3 bytes/char)
        // Gemini charges ~1 token per 4 chars or ~1 token per 3 bytes, whichever is higher
        const bytesIn = Buffer.byteLength(systemPrompt + userMessage, "utf8")
        const bytesOut = Buffer.byteLength(raw, "utf8")
        const tokensIn = Math.max(Math.ceil((systemPrompt.length + userMessage.length) / 4), Math.ceil(bytesIn / 3))
        const tokensOut = Math.max(Math.ceil(raw.length / 4), Math.ceil(bytesOut / 3))
        result = { content: raw, tokensIn, tokensOut, model }
      } else {
        result = await callMistral(systemPrompt, userMessage, { ...options, model }, timeout)
      }

      await recordSuccess(provider)
      await logAiUsage(userId, provider, result.model, result.tokensIn, result.tokensOut)
      log.info(`[AI Router] provider=${provider}`, { task, model: result.model })
      return sanitizeOutput(result.content)

    } catch (error) {
      const msg = (error as Error).message || ""
      const kind = classifyError(msg)

      if (kind === "config") {
        log.warn("ai.provider_config_error", { provider, error: msg.slice(0, 100) })
        return null
      }

      if (kind === "transient") {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt]))
          continue
        }
        log.warn("ai.provider_transient_failure", { provider, attempts: attempt + 1 })
        return null
      }

      if (kind === "rate-limit") {
        await recordFailure(provider)
        log.warn("ai.provider_rate_limited", { provider })
        return null
      }

      if (kind === "filtered") {
        // Content blocked by provider safety policy - not a provider fault.
        // Skip to next provider without counting as a circuit failure.
        log.warn("ai.provider_content_filtered", { provider, error: msg.slice(0, 100) })
        return null
      }

      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS[attempt]))
        continue
      }
      await recordFailure(provider)
      log.error("ai.provider_hard_error", { provider, error: msg })
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

  // Scope cache key by userId so users never receive another user's personalized output.
  const baseHash = hashPrompt(systemPrompt, userMessage, { json, temperature, maxTokens })
  const promptHash = userId !== "anonymous" ? `${userId.slice(0, 16)}:${baseHash}` : baseHash

  if (cache) {
    const cached = await getCachedAiResponse(promptHash)
    if (cached) return cached
  }

  await enforceDailySpendCap()

  const order = providerOrder[task]
  const callOptions: CallOptions = { json, temperature, maxTokens }

  for (const candidate of order) {
    const content = await callProvider(candidate, task, systemPrompt, userMessage, callOptions, timeout, userId, plan)
    if (content === null) continue

    // A provider can return content without throwing (e.g. truncated by its own
    // token budget) yet still be unusable. In JSON mode, verify it actually
    // parses before accepting it - otherwise fall through to the next provider
    // instead of returning garbage as if it were a success.
    if (json && safeParseJson(content) === null) {
      log.warn("ai.provider_unparseable_json", { provider: candidate, task })
      continue
    }

    if (cache) await cacheAiResponse(promptHash, content, cacheTtl)
    return content
  }

  log.warn("ai.all_providers_unavailable", { task })
  throw new Error("All AI services unavailable. Please try again in a moment.")
}
