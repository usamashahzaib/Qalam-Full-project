import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"
import { env } from "@/lib/server/env"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }
type Bucket = { count: number; resetTime: number }

const memoryStore = new Map<string, Bucket>()
const WINDOW_MS = 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of memoryStore) {
    if (bucket.resetTime < now) memoryStore.delete(key)
  }
}, WINDOW_MS)

const planLimits: Record<string, number> = { free: 5, solo: 10, pro: 20, agency: 50 }

let redisClient: Redis | null = null
let redisLimiters: Record<string, Ratelimit> | null = null

const getRedis = (): { redis: Redis; limiters: Record<string, Ratelimit> } | null => {
  if (!env.upstashRedisUrl?.startsWith("https://") || !env.upstashRedisToken) return null
  if (redisClient && redisLimiters) return { redis: redisClient, limiters: redisLimiters }
  redisClient = new Redis({ url: env.upstashRedisUrl, token: env.upstashRedisToken })
  redisLimiters = {
    free: new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(planLimits.free, "1 m") }),
    solo: new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(planLimits.solo, "1 m") }),
    pro: new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(planLimits.pro, "1 m") }),
    agency: new Ratelimit({ redis: redisClient, limiter: Ratelimit.slidingWindow(planLimits.agency, "1 m") }),
  }
  return { redis: redisClient, limiters: redisLimiters }
}

const memoryFallback = (key: string, limit: number): LimitResult => {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (existing && existing.resetTime > now) {
    existing.count += 1
    const allowed = existing.count <= limit
    return { allowed, limit, remaining: Math.max(0, limit - existing.count), reset: existing.resetTime }
  }
  const resetTime = now + WINDOW_MS
  memoryStore.set(key, { count: 1, resetTime })
  return { allowed: true, limit, remaining: limit - 1, reset: resetTime }
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export async function checkRateLimit(
  identifier: string,
  plan: string,
  ip: string,
): Promise<LimitResult> {
  const planKey = planLimits[plan.toLowerCase()] !== undefined ? plan.toLowerCase() : "free"
  const limit = planLimits[planKey]
  const memKey = `ip:${ip}:route:${identifier}`

  try {
    const store = getRedis()
    if (store) {
      const limiter = store.limiters[planKey] ?? store.limiters.free
      const result = await limiter.limit(memKey)
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    }
  } catch {
    // Redis failed - fall through to in-memory
  }

  return memoryFallback(memKey, limit)
}

export async function checkBotDetection(ip: string, userAgent: string | null): Promise<boolean> {
  if (!userAgent || !userAgent.trim()) return true
  const botPattern =
    /bot|crawler|spider|headless|python-requests|curl|wget|postman|Chrome-Lighthouse|PageSpeed/i
  return botPattern.test(userAgent)
}
