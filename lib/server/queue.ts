import { createHash } from "crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "@/lib/server/redis"
import { checkRateLimit } from "./rate-limiter"
import type { PlanTier } from "@/types/domain"

let groqLimiter: Ratelimit | null = null
let geminiLimiter: Ratelimit | null = null
let mistralLimiter: Ratelimit | null = null
let cerebrasLimiter: Ratelimit | null = null
let openrouterLimiter: Ratelimit | null = null

const getGroqLimiter = () => {
  if (!getRedis()) return null
  groqLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(50, "1 m"),
    analytics: true,
  })
  return groqLimiter
}

const getGeminiLimiter = () => {
  if (!getRedis()) return null
  geminiLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
  })
  return geminiLimiter
}

const getMistralLimiter = () => {
  if (!getRedis()) return null
  mistralLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
  })
  return mistralLimiter
}

const getCerebrasLimiter = () => {
  if (!getRedis()) return null
  cerebrasLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
  })
  return cerebrasLimiter
}

const getOpenRouterLimiter = () => {
  if (!getRedis()) return null
  openrouterLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
  })
  return openrouterLimiter
}

// In-process fallback rate limiter when Redis is unavailable (imperfect across instances but functional)
const _inMemoryBuckets = new Map<string, { count: number; resetAt: number }>()
function inMemoryRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = _inMemoryBuckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    _inMemoryBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, limit, remaining: limit - 1, reset: now + windowMs }
  }
  bucket.count++
  const remaining = Math.max(0, limit - bucket.count)
  return { allowed: bucket.count <= limit, limit, remaining, reset: bucket.resetAt }
}

export async function checkAiRateLimit(
  userId: string,
  _plan: string,
  provider: "groq" | "gemini" | "mistral" | "cerebras" | "openrouter"
) {
  const r = getRedis()
  if (!r) {
    // No Redis - use in-process fallback (per instance, not global - better than blocking)
    const limit = provider === "groq" ? 50 : provider === "openrouter" ? 20 : 30
    return inMemoryRateLimit(`ai_${provider}_${userId}`, limit, 60_000)
  }

  const limiter =
    provider === "groq"
      ? getGroqLimiter()
      : provider === "gemini"
        ? getGeminiLimiter()
        : provider === "mistral"
          ? getMistralLimiter()
          : provider === "cerebras"
            ? getCerebrasLimiter()
            : getOpenRouterLimiter()
  if (!limiter) {
    const limit = provider === "groq" ? 50 : provider === "openrouter" ? 20 : 30
    return inMemoryRateLimit(`ai_${provider}_${userId}`, limit, 60_000)
  }

  const key = `ai_${provider}_${userId}`
  const result = await limiter.limit(key)

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export async function cacheAiResponse(
  promptHash: string,
  response: string,
  ttlSeconds = 86400
) {
  const r = getRedis()
  if (!r) return
  try {
    await r.setex(`ai_cache:${promptHash}`, ttlSeconds, response)
  } catch (e) {
    console.error("[Redis Cache Write Error]", (e as Error).message)
  }
}

export async function getCachedAiResponse(promptHash: string): Promise<string | null> {
  const r = getRedis()
  if (!r) return null
  try {
    return await r.get<string>(`ai_cache:${promptHash}`)
  } catch (e) {
    console.error("[Redis Cache Read Error]", (e as Error).message)
    return null
  }
}

export function hashPrompt(system: string, user: string, options: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify({ system, user, options }))
    .digest("hex")
    .slice(0, 32)
}

let signupLimiter: Ratelimit | null = null
let forgotLimiter: Ratelimit | null = null

const getSignupLimiter = () => {
  if (!getRedis()) return null
  signupLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: false,
  })
  return signupLimiter
}

const getForgotLimiter = () => {
  if (!getRedis()) return null
  forgotLimiter ??= new Ratelimit({
    redis: getRedis()!,
    limiter: Ratelimit.slidingWindow(3, "60 m"),
    analytics: false,
  })
  return forgotLimiter
}

export async function checkAuthRateLimit(ip: string, action: "signup" | "forgot-password") {
  const r = getRedis()
  // If Redis is unavailable, fail open for auth — blocking signup is too disruptive
  if (!r) {
    // Fail closed on auth rate limiting by falling back to a conservative in-memory limiter
    return inMemoryRateLimit(`auth_${action}_${ip}`, 3, 60_000)
  }

  const limiter = action === "signup" ? getSignupLimiter() : getForgotLimiter()
  if (!limiter) {
    return inMemoryRateLimit(`auth_${action}_${ip}`, 3, 60_000)
  }

  const key = `auth_${action}_${ip}`
  const result = await limiter.limit(key)

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// ── Generation queue ──────────────────────────────────────────────────────────

const GENERATION_QUEUE_KEY = "generation_queue"

interface QueuedRequest {
  id: string
  userId: string
  task: string
  payload: unknown
  priority: number
  timestamp: number
}

const PLAN_PRIORITY: Record<PlanTier, number> = { Free: 1, Solo: 2, Pro: 3, Agency: 4 }

export async function enqueueRequest(
  userId: string,
  plan: PlanTier,
  task: string,
  payload: unknown,
): Promise<{ id: string; position: number; estimatedWait: number; rateLimited: boolean; message?: string }> {
  const rateLimit = await checkRateLimit(userId, plan)
  if (!rateLimit.allowed) {
    return { id: "", position: 0, estimatedWait: 0, rateLimited: true }
  }

  const r = getRedis()
  if (!r) {
    return { id: crypto.randomUUID(), position: 1, estimatedWait: 0, rateLimited: false, message: "Processing your request..." }
  }

  const id = crypto.randomUUID()
  const priority = PLAN_PRIORITY[plan] ?? 1
  const queued: QueuedRequest = { id, userId, task, payload, priority, timestamp: Date.now() }

  const score = priority * 1_000_000_000_000 + Date.now()
  await r.zadd(GENERATION_QUEUE_KEY, { score, member: JSON.stringify(queued) })

  const all = (await r.zrange(GENERATION_QUEUE_KEY, 0, -1)) as string[]
  const position = all.findIndex((item) => {
    try { return (JSON.parse(item) as QueuedRequest).id === id } catch { return false }
  }) + 1 || 1
  const estimatedWait = position * 3

  const message =
    position === 1
      ? "You're first in line! Starting soon..."
      : `You're ${position} in line. Estimated wait: ${Math.ceil(estimatedWait / 60)} min.`

  return { id, position, estimatedWait, rateLimited: false, message }
}

export async function getQueuePosition(
  requestId: string,
): Promise<{ position: number; estimatedWait: number } | null> {
  const r = getRedis()
  if (!r) return null

  const all = (await r.zrange(GENERATION_QUEUE_KEY, 0, -1)) as string[]
  const position = all.findIndex((item) => {
    try { return (JSON.parse(item) as QueuedRequest).id === requestId } catch { return false }
  }) + 1

  if (position === 0) return null
  return { position, estimatedWait: position * 3 }
}
