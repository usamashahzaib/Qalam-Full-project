import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { signCheckoutToken } from "@/lib/server/checkout-token"

// Mints a short-lived token binding a Lemon Squeezy checkout to the caller's
// own authenticated session, so the payment webhook has a tamper-proof way to
// know which account a payment belongs to (see lib/server/checkout-token.ts).
export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const token = signCheckoutToken(user.id)
    return NextResponse.json({ token })
  })(request)
}
