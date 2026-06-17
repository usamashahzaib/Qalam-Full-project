import { Ratelimit } from "@upstash/ratelimit"
import type { NextRequest } from "next/server"
import { getRedis } from "./redis"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }
type Bucket = { count: number; resetTime: number }

// In-memory store used only when Redis is not configured (dev/CI without Redis)
const memoryStore = new Map<string, Bucket>()
const WINDOW_MS = 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of memoryStore) {
    if (bucket.resetTime < now) memoryStore.delete(key)
  }
}, WINDOW_MS)

const planLimits: Record<string, number> = { free: 5, solo: 10, pro: 20, agency: 50 }

let redisLimiters: Record<string, Ratelimit> | null = null

const getLimiters = (): Record<string, Ratelimit> | null => {
  const r = getRedis()
  if (!r) return null
  if (redisLimiters) return redisLimiters
  redisLimiters = {
    free: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(planLimits.free, "1 m") }),
    solo: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(planLimits.solo, "1 m") }),
    pro: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(planLimits.pro, "1 m") }),
    agency: new Ratelimit({ redis: r, limiter: Ratelimit.slidingWindow(planLimits.agency, "1 m") }),
  }
  return redisLimiters
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
  // x-real-ip is set by trusted reverse proxies (Vercel, nginx) and cannot be injected by clients
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  // Fall back to x-forwarded-for first entry (set by the outermost trusted proxy on Vercel)
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || "unknown"
}

export async function checkRateLimit(
  identifier: string,
  plan: string,
  ip: string,
): Promise<LimitResult> {
  const planKey = planLimits[plan.toLowerCase()] !== undefined ? plan.toLowerCase() : "free"
  const limit = planLimits[planKey]
  const memKey = `ip:${ip}:route:${identifier}`

  const limiters = getLimiters()
  if (limiters) {
    try {
      const limiter = limiters[planKey] ?? limiters.free
      const result = await limiter.limit(memKey)
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch {
      // Redis configured but threw - fail open rather than bypass via memory
      console.error("[RateLimit] Redis error - allowing request")
      return { allowed: true, limit, remaining: 1, reset: Date.now() + WINDOW_MS }
    }
  }

  // Redis not configured - use in-memory (dev mode only)
  return memoryFallback(memKey, limit)
}

export async function checkBotDetection(ip: string, userAgent: string | null): Promise<boolean> {
  if (!userAgent || !userAgent.trim()) return true
  const botPattern =
    /bot|crawler|spider|headless|python-requests|curl|wget|postman|Chrome-Lighthouse|PageSpeed/i
  return botPattern.test(userAgent)
}
