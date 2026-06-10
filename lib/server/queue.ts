import { createHash } from "crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "@/lib/server/redis"

let groqLimiter: Ratelimit | null = null
let geminiLimiter: Ratelimit | null = null

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

export async function checkAiRateLimit(
  userId: string,
  _plan: string,
  provider: "groq" | "gemini"
) {
  const r = getRedis()
  if (!r) return { allowed: false, limit: 0, remaining: 0, reset: Date.now() + 60000 }

  const limiter = provider === "groq" ? getGroqLimiter() : getGeminiLimiter()
  if (!limiter) return { allowed: false, limit: 0, remaining: 0, reset: Date.now() + 60000 }

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
  if (!r) return { allowed: true, limit: 5, remaining: 5, reset: Date.now() + 60000 }

  const limiter = action === "signup" ? getSignupLimiter() : getForgotLimiter()
  if (!limiter) return { allowed: true, limit: 5, remaining: 5, reset: Date.now() + 60000 }

  const key = `auth_${action}_${ip}`
  const result = await limiter.limit(key)

  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}
