import "server-only"

import type { NextRequest } from "next/server"
import { getRedis } from "./redis"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }
type Bucket = { tokens: number; lastRefill: number }

const memoryStore = new Map<string, Bucket>()
const planLimits: Record<string, number> = { free: 5, solo: 10, pro: 20, agency: 50 }

export class TokenBucket {
  constructor(
    public capacity: number,
    public refillRate: number,
    public windowMs: number = 60_000
  ) {}

  async tryConsume(key: string, tokens: number = 1): Promise<boolean> {
    const redis = getRedis()
    const now = Date.now()

    if (redis) {
      const redisKey = `ratelimit:${key}`
      const data = await redis.get<Bucket>(redisKey)
      let bucketTokens = data?.tokens ?? this.capacity
      const lastRefill = data?.lastRefill ?? now
      const elapsed = now - lastRefill
      const tokensToAdd = (elapsed / this.windowMs) * this.capacity
      bucketTokens = Math.min(this.capacity, bucketTokens + tokensToAdd)

      if (bucketTokens >= tokens) {
        bucketTokens -= tokens
        await redis.set(redisKey, { tokens: bucketTokens, lastRefill: now }, { ex: Math.ceil(this.windowMs / 1000) * 2 })
        return true
      }
      await redis.set(redisKey, { tokens: bucketTokens, lastRefill: now }, { ex: Math.ceil(this.windowMs / 1000) * 2 })
      return false
    }

    if (process.env.NODE_ENV === "production") {
      console.warn("[rate-limit] Redis unavailable, using in-memory fallback")
    }
    return this._tryConsumeMemory(key, tokens, now)
  }

  async getState(key: string): Promise<Bucket> {
    const redis = getRedis()
    const state = redis ? await redis.get<Bucket>(`ratelimit:${key}`) : memoryStore.get(key)
    return state ?? { tokens: this.capacity, lastRefill: Date.now() }
  }

  private _tryConsumeMemory(key: string, tokens: number, now: number): boolean {
    const data = memoryStore.get(key)
    let bucketTokens = data?.tokens ?? this.capacity
    const lastRefill = data?.lastRefill ?? now
    const elapsed = now - lastRefill
    const tokensToAdd = (elapsed / this.windowMs) * this.capacity
    bucketTokens = Math.min(this.capacity, bucketTokens + tokensToAdd)

    if (bucketTokens >= tokens) {
      memoryStore.set(key, { tokens: bucketTokens - tokens, lastRefill: now })
      return true
    }
    memoryStore.set(key, { tokens: bucketTokens, lastRefill: now })
    return false
  }
}

export function getClientIp(request: NextRequest): string {
  // On Vercel, request.ip is set by the Edge Network and cannot be spoofed.
  if ((request as unknown as { ip?: string }).ip) return (request as unknown as { ip: string }).ip

  // Trust platform-injected headers over client-supplied XFF.
  const cfIp = request.headers.get("cf-connecting-ip")?.trim()
  if (cfIp) return cfIp

  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp

  // Take the RIGHTMOST XFF hop - the one appended by the trusted proxy - since
  // clients can freely forge any number of leftmost hops to evade rate limits.
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean)
    return hops[hops.length - 1] ?? "unknown"
  }

  return "unknown"
}

export async function checkRateLimit(
  identifier: string,
  plan: string,
  ip: string,
): Promise<LimitResult> {
  const planKey = planLimits[plan.toLowerCase()] !== undefined ? plan.toLowerCase() : "free"
  const limit = planLimits[planKey]
  const key = `ip:${ip}:route:${identifier}`
  const bucket = new TokenBucket(limit, limit)
  try {
    const allowed = await bucket.tryConsume(key)
    const state = await bucket.getState(key)
    return {
      allowed,
      limit,
      remaining: Math.max(0, Math.floor(state.tokens)),
      reset: state.lastRefill + bucket.windowMs,
    }
  } catch {
    // Fail closed on Redis errors - deny the request rather than bypass rate limiting
    return { allowed: false, limit, remaining: 0, reset: Date.now() + 60_000 }
  }
}

export async function checkBotDetection(ip: string, userAgent: string | null): Promise<boolean> {
  void ip
  if (!userAgent?.trim()) return true
  return /bot|crawler|spider|headless|python-requests|curl|wget|postman|Chrome-Lighthouse|PageSpeed/i.test(userAgent)
}