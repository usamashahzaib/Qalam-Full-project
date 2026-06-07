import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }
type Bucket = { count: number; resetTime: number }
type Plan = "free" | "solo" | "pro" | "agency"

const limits: Record<Plan | "ip", number> = { free: 5, solo: 10, pro: 20, agency: 20, ip: 30 }
const buckets = new Map<string, Bucket>()
const WINDOW_MS = 60_000
let lastCleanup = 0
let redisLimiters: Record<"free" | "solo" | "pro" | "ip", Ratelimit> | null = null

const hasRedis = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://") && process.env.UPSTASH_REDIS_REST_TOKEN)

const getRedisLimiters = () => {
  if (!hasRedis()) return null
  if (redisLimiters) return redisLimiters
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })
  redisLimiters = {
    free: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limits.free, "1 m") }),
    solo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limits.solo, "1 m") }),
    pro: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limits.pro, "1 m") }),
    ip: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limits.ip, "1 m") }),
  }
  return redisLimiters
}

const clean = () => {
  const now = Date.now()
  if (now - lastCleanup < WINDOW_MS) return
  for (const [key, bucket] of buckets) {
    if (bucket.resetTime <= now) buckets.delete(key)
  }
  lastCleanup = now
}

const fallbackLimit = (key: string, limit: number): LimitResult => {
  clean()
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetTime <= now) {
    buckets.set(key, { count: 1, resetTime: now + WINDOW_MS })
    return { allowed: true, limit, remaining: limit - 1, reset: now + WINDOW_MS }
  }
  if (bucket.count >= limit) return { allowed: false, limit, remaining: 0, reset: bucket.resetTime }
  bucket.count += 1
  return { allowed: true, limit, remaining: Math.max(0, limit - bucket.count), reset: bucket.resetTime }
}

const planKey = (plan: string): Plan => {
  const key = plan.toLowerCase()
  if (key === "solo") return "solo"
  if (key === "pro") return "pro"
  if (key === "agency") return "agency"
  return "free"
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous"
}

export async function checkRateLimit(identifier: string, plan: string, ip: string): Promise<LimitResult> {
  const key = planKey(plan)
  try {
    const redis = getRedisLimiters()
    if (redis) {
      const ipResult = await redis.ip.limit(`ip:${ip}`)
      if (!ipResult.success) return { allowed: false, limit: limits.ip, remaining: 0, reset: ipResult.reset }
      const limiter = key === "agency" ? redis.pro : redis[key]
      const result = await limiter.limit(`user:${identifier}`)
      return { allowed: result.success, limit: result.limit, remaining: result.remaining, reset: result.reset }
    }
    const ipResult = fallbackLimit(`ip:${ip}:route:all`, limits.ip)
    if (!ipResult.allowed) return ipResult
    return fallbackLimit(`ip:${ip}:route:${identifier}`, limits[key])
  } catch {
    return fallbackLimit(`ip:${ip}:route:${identifier}`, limits[key])
  }
}

export async function checkBotDetection(ip: string, userAgent: string): Promise<boolean> {
  if (!ip || !userAgent?.trim()) return true
  return /(bot|crawler|spider|scrapy|curl|wget|python-requests|headless|phantom|selenium|playwright)/i.test(userAgent)
}
