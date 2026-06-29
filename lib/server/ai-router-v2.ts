import { checkAiRateLimit, cacheAiResponse, getCachedAiResponse, hashPrompt } from "./queue"
import { callGemini } from "./gemini-client"
import { callGroq, type GroqModel } from "./groq-client"
import { callMistral } from "./mistral-client"
import { createServiceClient } from "./supabase-rest"
import { getFallbackHook, getFallbackPost } from "./fallback"
import { checkCircuit, recordFailure, recordSuccess } from "./circuit-breaker"
import { log } from "./logging"
import type { OpenAiCompatibleResult } from "./openai-compatible-client"

type AiProvider = "groq" | "gemini" | "mistral"
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
    // ── Inline transitional filler ─────────────────────────────────────────────
    // Pattern: phrase + comma/colon/space → strip phrase, keep the rest.
    // Re-capitalisation pass below restores sentence-start casing.
    .replace(
      /\b(?:needless to say|suffice it to say|without further ado|make no mistake|let me be (?:clear|honest)|here'?s the thing|at the end of the day|that being said|having said that)[,:\s]+/gi,
      ""
    )
    .replace(/\bit goes without saying that\s+/gi, "")
    // ── Re-capitalise after stripping left a lowercase sentence start ──────────
    .replace(/(^|\.\s+|!\s+|\?\s+)([a-z])/g, (_, prefix, letter) => prefix + letter.toUpperCase())
    .replace(/^([a-z])/gm, (_, letter) => letter.toUpperCase())
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
    if (insertErr && insertErr.code !== "42P01") log.warn("ai_usage.insert_failed", { error: insertErr.message })
  } catch { void 0 }
}

// ── 1.2: Model mapping per task per provider ──────────────────────────────────
const taskModelMap: Record<AiTask, Record<AiProvider, string>> = {
  "post-generation":       { mistral: "mistral-small-latest", gemini: "gemini-2.5-flash",  groq: "llama-3.1-8b-instant" },
  "competitor-analysis":   { gemini:  "gemini-2.5-pro",       groq:   "llama-3.3-70b-versatile", mistral: "mistral-small-latest" },
  "hook-generation":       { groq: "llama-3.1-8b-instant", mistral: "mistral-small-latest", gemini: "gemini-2.5-flash" },
  "carousel-outline":      { mistral: "mistral-small-latest", gemini: "gemini-2.5-flash",  groq: "llama-3.1-8b-instant" },
  "voice-profile":         { mistral: "mistral-medium-2505",  gemini: "gemini-2.5-pro",    groq: "llama-3.3-70b-versatile" },
  "chat-strategist":       { gemini:  "gemini-2.5-flash",     mistral: "mistral-small-latest", groq: "llama-3.1-8b-instant" },
  "post-improvement":      { mistral: "mistral-small-latest", gemini: "gemini-2.5-pro",    groq: "llama-3.3-70b-versatile" },
  "engagement-prediction": { groq:    "llama-3.1-8b-instant", gemini: "gemini-2.5-flash",  mistral: "mistral-small-latest" },
}

// ── 1.1/1.3: Provider order ───────────────────────────────────────────────────
// Routing: Mistral PRIMARY → Gemini FALLBACK → Groq SPEED ONLY.
// Competitor/chat tasks lead with Gemini for better reasoning depth.
const providerOrder: Record<AiTask, AiProvider[]> = {
  "post-generation":       ["mistral", "gemini", "groq"],
  "competitor-analysis":   ["gemini",  "mistral", "groq"],
  "hook-generation":       ["groq", "mistral", "gemini"],
  "carousel-outline":      ["mistral", "gemini", "groq"],
  "voice-profile":         ["mistral", "gemini", "groq"],
  "chat-strategist":       ["gemini",  "mistral", "groq"],
  "post-improvement":      ["mistral", "gemini", "groq"],
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
      logAiUsage(userId, provider, result.model, result.tokensIn, result.tokensOut)
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

  const order = providerOrder[task]
  const callOptions: CallOptions = { json, temperature, maxTokens }

  for (const candidate of order) {
    const content = await callProvider(candidate, task, systemPrompt, userMessage, callOptions, timeout, userId, plan)
    if (content !== null) {
      if (cache) await cacheAiResponse(promptHash, content, cacheTtl)
      return content
    }
  }

  log.warn("ai.all_providers_unavailable", { task })
  const topicMatch = userMessage.match(/topic[:\s]+([^\n]+)/i)
  const topic = topicMatch?.[1]?.trim() ?? "this topic"
  if (task === "hook-generation") return getFallbackHook(topic)
  if (task === "post-generation") return getFallbackPost(topic)
  throw new Error("All AI services unavailable. Please try again in a moment.")
}
