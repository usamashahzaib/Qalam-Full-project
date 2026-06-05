import { Redis } from "@upstash/redis"

let redis: Redis | null = null

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || ""
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || ""
  if (!url.startsWith("https://") || url.includes("...") || !token || token.includes("...")) return null
  redis ??= new Redis({ url, token })
  return redis
}

export async function checkAndIncrementLimit(
  workspaceId: string,
  feature: "drafts" | "carousels" | "research",
  plan: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = getLimitForPlan(plan, feature)
  if (limit === "unlimited") return { allowed: true, remaining: Infinity, limit: Infinity }
  const activeRedis = getRedis()
  if (!activeRedis) return { allowed: true, remaining: limit, limit }

  const key = `limit:${workspaceId}:${feature}:${new Date().toISOString().slice(0, 7)}`

  const current = await activeRedis.incr(key)
  if (current === 1) {
    await activeRedis.expire(key, 60 * 60 * 24 * 35)
  }

  const remaining = limit - current

  if (current > limit) {
    await activeRedis.decr(key)
    return { allowed: false, remaining: 0, limit }
  }

  return { allowed: true, remaining: Math.max(0, remaining), limit }
}

function getLimitForPlan(plan: string, feature: string): number | "unlimited" {
  const limits = {
    Free: { drafts: 10, carousels: 2, research: 0 },
    Solo: { drafts: 25, carousels: 5, research: 0 },
    Pro: { drafts: 60, carousels: 15, research: 5 },
    Agency: { drafts: 60, carousels: 50, research: 25 },
  }
  return limits[plan as keyof typeof limits]?.[feature as keyof (typeof limits)["Free"]] ?? 0
}
