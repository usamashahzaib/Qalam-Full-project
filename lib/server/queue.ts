import "server-only"

import { createHash } from "crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "@/lib/server/redis"
import { log } from "./logging"
import type { PlanTier } from "@/types/domain"

// ── Per-plan generation rate limit ──────────────────────────────────────────
// Formerly lib/server/rate-limiter.ts - folded in here since enqueueRequest()
// is its only caller. Backed by @upstash/ratelimit like every other limiter
// in the app, instead of a hand-rolled Redis incr/expire counter.

const GENERATION_PLAN_LIMITS: Record<PlanTier, number> = {
  Free: 5,
  Solo: 15,
  Pro: 50,
  Agency: 9999,
}

const _generationLimiters = new Map<PlanTier, Ratelimit>()

function getGenerationLimiter(plan: PlanTier, limit: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  let limiter = _generationLimiters.get(plan)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 h"),
      prefix: "rl:generation",
    })
    _generationLimiters.set(plan, limiter)
  }
  return limiter
}

export async function checkGenerationRateLimit(
  userId: string,
  plan: PlanTier,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const limit = GENERATION_PLAN_LIMITS[plan] ?? GENERATION_PLAN_LIMITS.Free
  const key = `generation:${userId}`
  const limiter = getGenerationLimiter(plan, limit)

  if (!limiter) {
    const result = inMemoryRateLimit(key, limit, 3_600_000)
    return { allowed: result.allowed, remaining: result.remaining, resetTime: result.reset }
  }

  try {
    const { success, remaining, reset } = await limiter.limit(key)
    return { allowed: success, remaining, resetTime: reset }
  } catch {
    // Fail closed on Redis errors - deny the request rather than bypass rate limiting
    return { allowed: false, remaining: 0, resetTime: Date.now() + 3_600_000 }
  }
}

let groqLimiter: Ratelimit | null = null
let geminiLimiter: Ratelimit | null = null
let mistralLimiter: Ratelimit | null = null

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
  provider: "groq" | "gemini" | "mistral"
) {
  const r = getRedis()
  if (!r) {
    // No Redis - use in-process fallback (per instance, not global - better than blocking)
    const limit = provider === "groq" ? 50 : 30
    return inMemoryRateLimit(`ai_${provider}_${userId}`, limit, 60_000)
  }

  const limiter =
    provider === "groq"
      ? getGroqLimiter()
      : provider === "gemini"
        ? getGeminiLimiter()
        : getMistralLimiter()
  if (!limiter) {
    const limit = provider === "groq" ? 50 : 30
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
    log.error("redis.cache_write_failed", { error: (e as Error).message })
  }
}

export async function getCachedAiResponse(promptHash: string): Promise<string | null> {
  const r = getRedis()
  if (!r) return null
  try {
    const cached = await r.get<unknown>(`ai_cache:${promptHash}`)
    if (cached == null) return null
    return typeof cached === "string" ? cached : JSON.stringify(cached)
  } catch (e) {
    log.error("redis.cache_read_failed", { error: (e as Error).message })
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

export async function checkAuthRateLimit(ip: string, action: "signup" | "forgot-password" | "resend-verification") {
  const r = getRedis()
  // If Redis is unavailable, fail open for auth - blocking signup is too disruptive
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

// ── System demand tracking ────────────────────────────────────────────────────
// Uses a 30-second time-bucket counter in Redis to measure concurrent load.
// When >10 requests land in the same 30s window, the system is "high demand".

const HIGH_DEMAND_THRESHOLD = 10
const BUCKET_SECONDS = 30

export interface DemandInfo {
  highDemand: boolean
  activeCount: number
  position: number           // approximate queue depth above threshold
  estimatedWaitSeconds: number
}

async function getDemandBucketKey(): Promise<string> {
  const bucket = Math.floor(Date.now() / (BUCKET_SECONDS * 1_000))
  return `qalam:demand:${bucket}`
}

export async function getSystemDemand(): Promise<DemandInfo> {
  const r = getRedis()
  if (!r) return { highDemand: false, activeCount: 0, position: 0, estimatedWaitSeconds: 0 }
  try {
    const key = await getDemandBucketKey()
    const count = (await r.get<number>(key)) ?? 0
    const highDemand = count > HIGH_DEMAND_THRESHOLD
    const position = highDemand ? Math.max(1, count - HIGH_DEMAND_THRESHOLD) : 0
    return { highDemand, activeCount: count, position, estimatedWaitSeconds: position * 3 }
  } catch {
    return { highDemand: false, activeCount: 0, position: 0, estimatedWaitSeconds: 0 }
  }
}

async function trackAndGetDemand(): Promise<DemandInfo> {
  const r = getRedis()
  if (!r) return { highDemand: false, activeCount: 0, position: 0, estimatedWaitSeconds: 0 }
  try {
    const key = await getDemandBucketKey()
    const pipeline = r.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, BUCKET_SECONDS * 2) // keep for 2 buckets to handle clock drift
    const results = await pipeline.exec()
    const count = (results[0] as number) ?? 1
    const highDemand = count > HIGH_DEMAND_THRESHOLD
    const position = highDemand ? Math.max(1, count - HIGH_DEMAND_THRESHOLD) : 0
    return { highDemand, activeCount: count, position, estimatedWaitSeconds: position * 3 }
  } catch {
    return { highDemand: false, activeCount: 0, position: 0, estimatedWaitSeconds: 0 }
  }
}

// ── Generation queue ──────────────────────────────────────────────────────────
// All generation is synchronous (serverless). enqueueRequest enforces rate
// limits and tracks system demand - callers can surface high-demand messaging.

export async function enqueueRequest(
  userId: string,
  plan: PlanTier,
  task: string,
  payload: unknown,
): Promise<{
  id: string
  position: number
  estimatedWait: number
  rateLimited: boolean
  highDemand: boolean
  activeCount: number
  estimatedWaitSeconds: number
  message?: string
}> {
  void task
  void payload
  const [rateLimit, demand] = await Promise.all([
    checkGenerationRateLimit(userId, plan),
    trackAndGetDemand(),
  ])

  if (!rateLimit.allowed) {
    return {
      id: "", position: 0, estimatedWait: 0, rateLimited: true,
      highDemand: demand.highDemand, activeCount: demand.activeCount,
      estimatedWaitSeconds: demand.estimatedWaitSeconds,
    }
  }

  return {
    id: crypto.randomUUID(),
    position: demand.position,
    estimatedWait: demand.estimatedWaitSeconds,
    rateLimited: false,
    highDemand: demand.highDemand,
    activeCount: demand.activeCount,
    estimatedWaitSeconds: demand.estimatedWaitSeconds,
    message: demand.highDemand
      ? `High demand - you're approximately #${demand.position} in queue`
      : "Processing your request...",
  }
}

// No queue is written, so every requestId is absent - the status route maps
// null → { status: "completed" }, which is the correct observable behaviour.
export async function getQueuePosition(
  requestId: string,
): Promise<{ position: number; estimatedWait: number } | null> {
  void requestId
  return null
}
