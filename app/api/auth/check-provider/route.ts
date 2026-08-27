import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { getClientIp } from "@/lib/server/rate-limit"
import { getRedis } from "@/lib/server/redis"

// Per-IP rate limit: 3 lookups per hour, backed by Upstash so it holds across
// serverless instances and cold starts (an in-memory Map does neither).
// Fails open when Redis is not configured - this is an info-leak guard, not a
// hard security boundary.
let _limiter: Ratelimit | null = null
function providerLimiter(): Ratelimit | null {
  if (_limiter) return _limiter
  const redis = getRedis()
  if (!redis) return null
  return (_limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "rl:check-provider",
  }))
}

async function checkProviderRateLimit(ip: string): Promise<boolean> {
  const limiter = providerLimiter()
  if (!limiter) return true // fail-open when Redis not configured
  const { success } = await limiter.limit(ip)
  return success
}

// Retained for older clients, but deliberately returns a uniform response.
// Sign-in method discovery leaks whether an account exists and how it authenticates.
export async function GET(request: NextRequest) {
  if (!(await checkProviderRateLimit(getClientIp(request)))) {
    return NextResponse.json({ provider: null }, { status: 429 })
  }

  return NextResponse.json({ provider: null })
}
