import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

let redis: Redis | null = null
let groqLimiter: Ratelimit | null = null
let geminiLimiter: Ratelimit | null = null

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token || url.includes("...") || token.includes("...")) return null
  redis ??= new Redis({ url, token })
  return redis
}

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
  if (!r) return { allowed: true, limit: 999, remaining: 999, reset: Date.now() + 60000 }

  const limiter = provider === "groq" ? getGroqLimiter() : getGeminiLimiter()
  if (!limiter) return { allowed: true, limit: 999, remaining: 999, reset: Date.now() + 60000 }

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
  await r.setex(`ai_cache:${promptHash}`, ttlSeconds, response)
}

export async function getCachedAiResponse(promptHash: string): Promise<string | null> {
  const r = getRedis()
  if (!r) return null
  return await r.get<string>(`ai_cache:${promptHash}`)
}

export function hashPrompt(system: string, user: string, options: unknown): string {
  const str = JSON.stringify({ system, user, options })
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `hash_${Math.abs(hash).toString(36)}`
}
