import { getRedis } from "./redis"
import type { PlanTier } from "@/types/domain"

const PLAN_LIMITS: Record<PlanTier, { generationsPerHour: number }> = {
  Free:   { generationsPerHour: 5 },
  Solo:   { generationsPerHour: 15 },
  Pro:    { generationsPerHour: 50 },
  Agency: { generationsPerHour: 9999 },
}

export async function checkRateLimit(
  userId: string,
  plan: PlanTier,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const limit = PLAN_LIMITS[plan]?.generationsPerHour ?? 5
  const key = `rate_limit:${userId}`
  const r = getRedis()

  if (!r) {
    // No Redis: fail open with a conservative in-memory approximation
    return { allowed: true, remaining: limit - 1, resetTime: Date.now() + 3_600_000 }
  }

  const current = ((await r.get<number>(key)) ?? 0)

  if (current >= limit) {
    const ttl = await r.ttl(key)
    return { allowed: false, remaining: 0, resetTime: Date.now() + ttl * 1_000 }
  }

  await r.incr(key)
  if (current === 0) await r.expire(key, 3600)

  return { allowed: true, remaining: limit - current - 1, resetTime: Date.now() + 3_600_000 }
}
