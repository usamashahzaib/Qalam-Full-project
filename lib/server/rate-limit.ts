import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import type { NextRequest } from "next/server"

type Limiters = Record<<"free" | "solo" | "pro" | "ip", Ratelimit>

let limiters: Limiters | null = null

const hasRedisEnv = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || ""
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  return process.env.NODE_ENV === "test" || (url.startsWith("https://") && !url.includes("...") && Boolean(token) && !token.includes("..."))
}

const getLimiters = () => {
  if (!hasRedisEnv()) return null
  if (limiters) return limiters

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  limiters = {
    free: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, "1 m"), analytics: true }),
    solo: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, "1 m"), analytics: true }),
    pro: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, "1 m"), analytics: true }),
    ip: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), analytics: true }),
  }

  return limiters
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const ips = forwarded.split(",").map(s => s.trim()).filter(Boolean)
    if (ips.length > 0) {
      return ips[ips.length - 1]
    }
  }
  return request.headers.get("x-real-ip") || "anonymous"
}

export async function checkRateLimit(
  identifier: string,
  plan: string,
  ip: string
): Promise<{ allowed: boolean; limit: number; remaining: number; reset: number }> {
  try {
    const activeLimiters = getLimiters()
    if (!activeLimiters) return { allowed: true, limit: Infinity, remaining: Infinity, reset: Date.now() + 60000 }

    const ipResult = await activeLimiters.ip.limit(ip)
    if (!ipResult.success) {
      return { allowed: false, limit: 30, remaining: 0, reset: Date.now() + 60000 }
    }

    const planLower = plan.toLowerCase()
    let limiter = activeLimiters.free
    if (planLower === "solo") limiter = activeLimiters.solo
    if (planLower === "pro" || planLower === "agency") limiter = activeLimiters.pro

    const result = await limiter.limit(identifier)

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    return { allowed: false, limit: 0, remaining: 0, reset: Date.now() + 60000 }
  }
}