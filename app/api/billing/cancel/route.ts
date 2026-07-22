import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import { cancelLemonSqueezySubscription } from "@/lib/server/lemonsqueezy-api"
import { getClientIp, TokenBucket } from "@/lib/server/rate-limit"
import { log } from "@/lib/server/logging"

type SubscriptionRow = { subscription_id: string }

// 3 attempts per 15 minutes per user - cancellation is rare and idempotent on the
// Lemon Squeezy side, this just guards against accidental repeat submits/abuse.
const cancelLimiter = new TokenBucket(3, 3, 15 * 60 * 1000)

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const ip = getClientIp(req)
    const allowed = await cancelLimiter.tryConsume(`billing-cancel:${user.id}:${ip}`)
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 })
    }

    const rows = await supabaseSelect<SubscriptionRow>(
      "payment_subscriptions",
      `user_id=eq.${encodeURIComponent(user.id)}&provider=eq.lemonsqueezy&status=eq.active&select=subscription_id&order=updated_at.desc&limit=1`
    )
    const subscription = rows[0]
    if (!subscription) {
      return NextResponse.json(
        { error: "No active self-serve subscription found. If your plan was set up manually, contact support to cancel it." },
        { status: 404 }
      )
    }

    try {
      const result = await cancelLemonSqueezySubscription(subscription.subscription_id)
      log.info("billing.cancel_requested", { userId: user.id, subscriptionId: subscription.subscription_id })
      return NextResponse.json({ success: true, endsAt: result.endsAt })
    } catch (err) {
      log.error("billing.cancel_failed", { userId: user.id, error: (err as Error).message })
      return NextResponse.json(
        { error: "Could not cancel your subscription right now. Please try again or contact support." },
        { status: 502 }
      )
    }
  })(request)
}
