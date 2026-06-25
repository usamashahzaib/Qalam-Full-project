import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getClientIp } from "@/lib/server/rate-limit"

// Per-IP rate limit: 3 lookups per hour
const _buckets = new Map<string, { count: number; resetAt: number }>()
function checkProviderRateLimit(ip: string): boolean {
  const now = Date.now()
  const bucket = _buckets.get(ip)
  if (!bucket || now > bucket.resetAt) {
    _buckets.set(ip, { count: 1, resetAt: now + 3_600_000 })
    return true
  }
  bucket.count++
  return bucket.count <= 3
}

// Returns which sign-in method an email uses, without revealing account existence.
// Used by login page to auto-redirect OAuth-only accounts to the right provider.
export async function GET(request: NextRequest) {
  if (!checkProviderRateLimit(getClientIp(request))) {
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
