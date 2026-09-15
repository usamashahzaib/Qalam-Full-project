import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { getRedis } from "@/lib/server/redis"
import { getClientIp } from "@/lib/server/rate-limit"

const WINDOW_MS = 60_000
const LIMITS: Record<string, number> = {
  handoff: 30,
  "handoff-start": 10,
  review: 60,
  drop: 30,
  "drop-transcribe": 6,
  proof: 60,
  pitch: 60,
}

const limiters = new Map<string, Ratelimit>()
const memory = new Map<string, { count: number; resetAt: number }>()

/**
 * Token links are unguessable, but the endpoints behind them still get a
 * per-IP ceiling so nobody can hammer token lookups or the transcription API.
 * Returns a 429 response when limited, null when the request may continue.
 */
export async function publicShareLimit(request: NextRequest, bucket: keyof typeof LIMITS | string): Promise<NextResponse | null> {
  const limit = LIMITS[bucket] ?? 30
  const key = `${bucket}:${getClientIp(request)}`
  const redis = getRedis()
  try {
    if (redis) {
      let limiter = limiters.get(bucket)
      if (!limiter) {
        limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, "60 s"), prefix: `rl:share:${bucket}` })
        limiters.set(bucket, limiter)
      }
      const { success } = await limiter.limit(key)
      return success ? null : tooMany()
    }
  } catch {
    // Fall through to the in-memory ceiling rather than failing open.
  }
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }
  entry.count++
  return entry.count > limit ? tooMany() : null
}

const tooMany = () => NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": "60" } })
