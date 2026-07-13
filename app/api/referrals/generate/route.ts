import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { generateReferralCode } from "@/lib/server/referrals"
import { TokenBucket, getClientIp } from "@/lib/server/rate-limit"
import { log } from "@/lib/server/logging"

const generateLimiter = new TokenBucket(10, 10, 60 * 60 * 1000)

// Pinned server-side - the discount rate must not be attacker-controlled.
const DISCOUNT_PERCENT = 20

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const ip = getClientIp(req)
    const allowed = await generateLimiter.tryConsume(`referral_generate:${ip}`)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 })
    }

    let body: Record<string, unknown> = {}
    try {
      body = await req.json()
    } catch {
      // no body is fine - all fields are optional
    }

    const maxUses = typeof body.maxUses === "number" && body.maxUses > 0 ? Math.floor(body.maxUses) : null
    const expiresAt = typeof body.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt) : null

    try {
      const result = await generateReferralCode({
        referrerUserId: user.id,
        referrerName: user.name || user.email || "User",
        referrerEmail: user.email || "",
        discountPercent: DISCOUNT_PERCENT,
        maxUses,
        expiresAt: expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : null,
      })
      log.info("referrals.generated", { userId: user.id })
      return NextResponse.json({ code: result.code, discountPercent: DISCOUNT_PERCENT }, { status: 201 })
    } catch (err) {
      log.error("referrals.generate_route_failed", { error: (err as Error).message })
      return NextResponse.json({ error: "Could not generate referral code. Please try again." }, { status: 500 })
    }
  })(request)
}
