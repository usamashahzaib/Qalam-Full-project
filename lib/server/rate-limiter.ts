import { getRedis } from "./redis"
import type { PlanTier } from "@/types/domain"

const PLAN_LIMITS: Record<PlanTier, { generationsPerHour: number }> = {
  Free:   { generationsPerHour: 5 },
  Solo:   { generationsPerHour: 15 },
  Pro:    { generationsPerHour: 50 },
  Agency: { generationsPerHour: 9999 },
}

// Per-instance in-memory fallback when Redis is unavailable.
// Not globally consistent across serverless instances, but prevents
// unlimited usage rather than failing open.
const _inMemoryBuckets = new Map<string, { count: number; resetAt: number }>()

export async function checkRateLimit(
  userId: string,
  plan: PlanTier,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const limit = PLAN_LIMITS[plan]?.generationsPerHour ?? 5
  const key = `rate_limit:${userId}`
  const r = getRedis()

  if (!r) {
    // No Redis: use in-memory bucket per instance instead of failing open
    const now = Date.now()
    const bucket = _inMemoryBuckets.get(key)
    if (!bucket || now > bucket.resetAt) {
      _inMemoryBuckets.set(key, { count: 1, resetAt: now + 3_600_000 })
      return { allowed: true, remaining: limit - 1, resetTime: now + 3_600_000 }
    }
    bucket.count++
    const allowed = bucket.count <= limit
    return { allowed, remaining: Math.max(0, limit - bucket.count), resetTime: bucket.resetAt }
  }

  // Atomic: increment first, then check. get→check→incr is a TOCTOU race
  // where N concurrent requests all read the same value and all pass the limit.
  const newCount = await r.incr(key)
  if (newCount === 1) await r.expire(key, 3600)

  if (newCount > limit) {
    const ttl = await r.ttl(key)
    return { allowed: false, remaining: 0, resetTime: Date.now() + ttl * 1_000 }
  }

  return { allowed: true, remaining: limit - newCount, resetTime: Date.now() + 3_600_000 }
}
