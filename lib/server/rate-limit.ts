import "server-only"

import type { NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "./redis"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }

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

export async function checkBotDetection(ip: string, userAgent: string | null): Promise<boolean> {
  void ip
  if (!userAgent?.trim()) return true
  return /bot|crawler|spider|headless|python-requests|curl|wget|postman|Chrome-Lighthouse|PageSpeed/i.test(userAgent)
}

// ── In-memory fallback ────────────────────────────────────────────────────────
// Only used when Redis isn't configured. Per-instance, not globally consistent
// across serverless instances, but prevents unlimited usage rather than
// failing open entirely.
const _inMemoryBuckets = new Map<string, { tokens: number; lastRefill: number }>()

function inMemoryTokenBucket(key: string, capacity: number, refillRate: number, windowMs: number): boolean {
  const now = Date.now()
  const data = _inMemoryBuckets.get(key)
  let tokens = data?.tokens ?? capacity
  const lastRefill = data?.lastRefill ?? now
  const elapsed = now - lastRefill
  tokens = Math.min(capacity, tokens + (elapsed / windowMs) * refillRate)

  if (tokens >= 1) {
    _inMemoryBuckets.set(key, { tokens: tokens - 1, lastRefill: now })
    return true
  }
  _inMemoryBuckets.set(key, { tokens, lastRefill: now })
  return false
}

// ── Token bucket (route-scoped, arbitrary capacity/refill) ────────────────────
// Backed by @upstash/ratelimit's tokenBucket algorithm so every limiter in the
// app shares one Redis-side implementation instead of hand-rolled get/set math.

export class TokenBucket {
  private limiter: Ratelimit | null | undefined

  constructor(
    public capacity: number,
    public refillRate: number,
    public windowMs: number = 60_000
  ) {}

  private getLimiter(): Ratelimit | null {
    if (this.limiter !== undefined) return this.limiter
    const redis = getRedis()
    if (!redis) return (this.limiter = null)
    return (this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(this.refillRate, `${Math.max(1, Math.ceil(this.windowMs / 1000))} s`, this.capacity),
      prefix: "rl:bucket",
    }))
  }

  async tryConsume(key: string): Promise<boolean> {
    const limiter = this.getLimiter()
    if (!limiter) {
      if (process.env.NODE_ENV === "production") {
        console.warn("[rate-limit] Redis unavailable, using in-memory fallback")
      }
      return inMemoryTokenBucket(key, this.capacity, this.refillRate, this.windowMs)
    }
    try {
      const { success } = await limiter.limit(key)
      return success
    } catch {
      // Fail closed on Redis errors - deny the request rather than bypass rate limiting.
      return false
    }
  }
}

// ── Plan-scoped route limiter ──────────────────────────────────────────────────
// Used by free-tools and other endpoints that key limits off (route, plan, ip).

const planLimits: Record<string, number> = { free: 5, solo: 10, pro: 20, agency: 50 }
const _routeLimiters = new Map<string, Ratelimit>()

function getRouteLimiter(planKey: string, limit: number): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  let limiter = _routeLimiters.get(planKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(limit, "60 s", limit),
      prefix: "rl:route",
    })
    _routeLimiters.set(planKey, limiter)
  }
  return limiter
}

export async function checkRateLimit(
  identifier: string,
  plan: string,
  ip: string,
): Promise<LimitResult> {
  const planKey = planLimits[plan.toLowerCase()] !== undefined ? plan.toLowerCase() : "free"
  const limit = planLimits[planKey]
  const key = `ip:${ip}:route:${identifier}`

  try {
    const limiter = getRouteLimiter(planKey, limit)
    if (!limiter) {
      const allowed = inMemoryTokenBucket(key, limit, limit, 60_000)
      const bucket = _inMemoryBuckets.get(key)
      return { allowed, limit, remaining: Math.max(0, Math.floor(bucket?.tokens ?? 0)), reset: Date.now() + 60_000 }
    }
    const { success, remaining, reset } = await limiter.limit(key)
    return { allowed: success, limit, remaining, reset }
  } catch {
    // Fail closed on Redis errors - deny the request rather than bypass rate limiting
    return { allowed: false, limit, remaining: 0, reset: Date.now() + 60_000 }
  }
}
