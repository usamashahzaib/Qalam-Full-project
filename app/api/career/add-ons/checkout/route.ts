import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { signAddonCheckoutToken } from "@/lib/server/checkout-token"
import { getCareerAddonCheckoutUrl } from "@/lib/career-checkout"
import { getClientIp, TokenBucket } from "@/lib/server/rate-limit"

const checkoutLimiter = new TokenBucket(10, 10, 15 * 60 * 1000)

type OrderRow = { id: string; addon_key: string; quantity: number; status: string }

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const allowed = await checkoutLimiter.tryConsume(`career-addon-checkout:${user.id}:${getClientIp(req)}`)
    if (!allowed) {
      return NextResponse.json({ error: "Too many checkout attempts. Try again shortly." }, { status: 429 })
    }

    const body = (await req.json().catch(() => null)) as { orderId?: string } | null
    const orderId = typeof body?.orderId === "string" ? body.orderId : ""
    if (!orderId) return NextResponse.json({ error: "Missing order id." }, { status: 400 })

    const { data: order, error } = await createServiceClient()
      .from("career_addon_orders")
      .select("id, addon_key, quantity, status")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle<OrderRow>()

    if (error) return NextResponse.json({ error: "Order lookup failed." }, { status: 500 })
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 })
    if (order.status !== "pending") {
      return NextResponse.json({ error: "This order is not awaiting payment." }, { status: 400 })
    }

    const token = signAddonCheckoutToken(user.id, order.id)
    const url = getCareerAddonCheckoutUrl(order.addon_key, {
      quantity: order.quantity,
      token,
      email: user.email,
    })
    if (!url) {
      return NextResponse.json({ error: "Card checkout is not set up for this add-on yet." }, { status: 503 })
    }

    return NextResponse.json({ url })
  })(request)
}
