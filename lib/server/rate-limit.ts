import "server-only"

import type { NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "./redis"

type LimitResult = { allowed: boolean; limit: number; remaining: number; reset: number }

// On Vercel, x-vercel-forwarded-for is set by the platform itself on every
// request, overwriting any client-supplied value - it is the only header here
// a client cannot forge. cf-connecting-ip/x-real-ip are trusted ONLY when
// TRUSTED_EDGE_PROXY confirms a real edge proxy sits in front and strips
// client-supplied copies of them before they reach us; without that proxy in
// place, both are plain client-controlled headers and trusting them lets an
// attacker mint a fresh rate-limit bucket on every request by randomizing them.
const trustedEdgeProxy = process.env.TRUSTED_EDGE_PROXY?.trim().toLowerCase()

export function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown"

  if (trustedEdgeProxy === "cloudflare") {
    const cfIp = request.headers.get("cf-connecting-ip")?.trim()
    if (cfIp) return cfIp
  }
  if (trustedEdgeProxy) {
    const realIp = request.headers.get("x-real-ip")?.trim()
    if (realIp) return realIp
  }

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

// ── Global free-tools budget ───────────────────────────────────────────────
// The per-IP limiter above stops one abusive IP, but a botnet on rotating IPs
// can still drive unbounded AI spend on the unauthenticated free tools since
// each IP gets its own fresh 5/min bucket. This adds one shared daily ceiling
// across all IPs and all free tools combined, so total exposure is capped
// regardless of how many source IPs are involved.
const FREE_TOOLS_DAILY_CAP = Number(process.env.FREE_TOOLS_DAILY_CAP) || 2000

// Redis-down fallback: per-instance, resets on cold start, and multiple
// concurrent instances each get their own counter - so this is deliberately a
// much lower ceiling than the Redis-backed one, not a proportional share of
// it. The AI-provider daily $ cap (ai-router-v2's enforceDailySpendCap) is the
// real backstop when AI_DAILY_SPEND_CAP_USD is configured; this just keeps a
// bound on request volume in the meantime, rather than failing open entirely
// while Redis is unavailable.
const FREE_TOOLS_FALLBACK_DAILY_CAP = Number(process.env.FREE_TOOLS_FALLBACK_DAILY_CAP) || 100
let _fallbackBudget: { day: string; count: number } | null = null

function inMemoryFreeToolsBudget(): boolean {
  const day = new Date().toISOString().slice(0, 10)
  if (!_fallbackBudget || _fallbackBudget.day !== day) {
    _fallbackBudget = { day, count: 0 }
  }
  _fallbackBudget.count += 1
  return _fallbackBudget.count <= FREE_TOOLS_FALLBACK_DAILY_CAP
}

export async function checkFreeToolsGlobalBudget(): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return inMemoryFreeToolsBudget()
  const day = new Date().toISOString().slice(0, 10)
  const key = `rl:global:free-tools:${day}`
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 2 * 24 * 60 * 60)
    return count <= FREE_TOOLS_DAILY_CAP
  } catch {
    // Redis reachable at getRedis() but failed mid-call (timeout, transient
    // error) - same degrade-to-a-bounded-fallback as the "no Redis configured"
    // path above, rather than allowing unlimited requests through.
    return inMemoryFreeToolsBudget()
  }
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
