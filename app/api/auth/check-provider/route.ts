import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { createServiceClient } from "@/lib/server/supabase-rest"
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

// Returns which sign-in method an email uses, without revealing account existence.
// Used by login page to auto-redirect OAuth-only accounts to the right provider.
export async function GET(request: NextRequest) {
  if (!(await checkProviderRateLimit(getClientIp(request)))) {
    return NextResponse.json({ provider: null }, { status: 429 })
  }

  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase()
  if (!email) return NextResponse.json({ provider: null })

  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("users")
      .select("password_hash, external_user_id")
      .eq("email", email)
      .maybeSingle()

    if (!data) return NextResponse.json({ provider: null })
    if (!data.password_hash && data.external_user_id) return NextResponse.json({ provider: "linkedin" })
    if (data.password_hash) return NextResponse.json({ provider: "email" })
    return NextResponse.json({ provider: null })
  } catch {
    return NextResponse.json({ provider: null })
  }
}
