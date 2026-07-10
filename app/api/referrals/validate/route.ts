import { NextRequest, NextResponse } from "next/server"
import { validateReferralCode } from "@/lib/server/referrals"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") || ""
  const result = await validateReferralCode(code)
  return NextResponse.json({
    valid: result.valid,
    discountPercent: result.discountPercent,
    remainingUses: result.remainingUses,
    referrerName: result.referrerName,
    message: result.error,
  })
}
