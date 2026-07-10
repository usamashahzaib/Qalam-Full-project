import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { applyReferralCode } from "@/lib/server/referrals"

const ERROR_MESSAGES: Record<string, string> = {
  self_referral_not_allowed: "You cannot use your own referral code.",
  referral_already_used: "You have already applied a referral code.",
  referral_code_generation_failed: "Something went wrong. Please try again.",
  referral_apply_failed: "Could not apply this referral code. Please try again.",
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
    }

    const code = String(body.code ?? "").trim()
    if (!code) {
      return NextResponse.json({ error: "Referral code is required." }, { status: 400 })
    }

    const result = await applyReferralCode(code, user.id)
    if (!result.success) {
      const message = ERROR_MESSAGES[result.error || ""] || result.error || "Could not apply referral code."
      return NextResponse.json({ success: false, discountPercent: 0, message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      discountPercent: result.discountPercent,
      message: `Referral code applied. You get ${result.discountPercent}% off.`,
    })
  })(request)
}
