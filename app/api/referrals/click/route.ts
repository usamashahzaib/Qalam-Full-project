import { NextRequest, NextResponse } from "next/server"
import { trackReferralClick } from "@/lib/server/referrals"
import { TokenBucket, getClientIp } from "@/lib/server/rate-limit"

const clickLimiter = new TokenBucket(30, 30, 60 * 1000)

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const allowed = await clickLimiter.tryConsume(`referral_click:${ip}`)
  if (!allowed) {
    return NextResponse.json({ tracked: false }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ tracked: false }, { status: 400 })
  }

  const code = String(body.code ?? "").trim()
  if (!code) {
    return NextResponse.json({ tracked: false }, { status: 400 })
  }

  const result = await trackReferralClick(code, {
    ip,
    userAgent: request.headers.get("user-agent"),
    landingPath: typeof body.landingPath === "string" ? body.landingPath.slice(0, 200) : null,
  })

  return NextResponse.json(result)
}
