import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createCheckoutSession } from "@/lib/server/checkout-session"

// Mints an opaque, server-stored token binding checkout to this account.
export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const token = await createCheckoutSession(user.id)
    return NextResponse.json({ token })
  })(request)
}
