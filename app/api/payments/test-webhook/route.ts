import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { requireAdminOps } from "@/lib/server/workspace"
import { env } from "@/lib/server/env"
import { signCheckoutToken } from "@/lib/server/checkout-token"
import { verifyAndExtractPayment, recordPaymentWebhook } from "@/lib/server/payments"
import { supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

// Mirrors the Lemon Squeezy event shapes lib/server/payments.ts actually parses,
// so this exercises the real verify + activate path instead of a parallel mock.
const SUPPORTED_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_payment_success",
  "subscription_payment_failed",
])

const REQUIRES_VARIANT = new Set(["order_created", "subscription_created", "subscription_updated"])

export async function POST(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = (await request.json().catch(() => ({}))) as {
    event_type?: string
    variant_id?: string
    user_id?: string
  }
  const eventType = String(body.event_type || "")
  const variantId = String(body.variant_id || "")
  const userId = String(body.user_id || "")

  if (!SUPPORTED_EVENTS.has(eventType)) {
    return NextResponse.json(
      { ok: false, error: "unsupported_event_type", supported: [...SUPPORTED_EVENTS] },
      { status: 400 }
    )
  }
  if (!userId) return NextResponse.json({ ok: false, error: "missing_user_id" }, { status: 400 })
  if (REQUIRES_VARIANT.has(eventType) && !variantId) {
    return NextResponse.json({ ok: false, error: "missing_variant_id" }, { status: 400 })
  }
  if (!env.lemonSqueezyWebhookSecret) {
    return NextResponse.json({ ok: false, error: "webhook_secret_not_configured" }, { status: 500 })
  }

  // Deterministic per-user so a subscription_created call followed by a
  // subscription_cancelled call in a later request naturally link up, the same
  // way a real subscription's id stays stable across its lifecycle events.
  const subscriptionId = `test-sub-${userId}`
  const token = signCheckoutToken(userId)
  const renewsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const attributes: Record<string, unknown> = {}
  let dataId = subscriptionId
  let dataType = "subscriptions"

  if (eventType === "order_created") {
    attributes.status = "paid"
    attributes.variant_id = variantId
    attributes.total = 1900
    attributes.currency = "USD"
    dataId = `test-order-${Date.now()}`
    dataType = "orders"
  } else if (eventType === "subscription_created") {
    attributes.status = "active"
    attributes.variant_id = variantId
    attributes.renews_at = renewsAt
  } else if (eventType === "subscription_updated") {
    attributes.status = "active"
    attributes.variant_id = variantId
    attributes.renews_at = renewsAt
  } else if (eventType === "subscription_cancelled") {
    attributes.status = "cancelled"
    attributes.ends_at = renewsAt
  } else if (eventType === "subscription_expired") {
    attributes.status = "expired"
    attributes.ends_at = new Date().toISOString()
  } else if (eventType === "subscription_payment_success") {
    attributes.billing_reason = "renewal"
    attributes.subscription_id = subscriptionId
    attributes.total = 1900
    attributes.currency = "USD"
    dataId = `test-invoice-${Date.now()}`
    dataType = "subscription-invoices"
  } else if (eventType === "subscription_payment_failed") {
    attributes.subscription_id = subscriptionId
    dataId = `test-invoice-${Date.now()}`
    dataType = "subscription-invoices"
  }

  const payload = {
    meta: { event_name: eventType, custom_data: { token } },
    data: { id: dataId, type: dataType, attributes },
  }
  const rawBody = JSON.stringify(payload)
  const signature = crypto.createHmac("sha256", env.lemonSqueezyWebhookSecret).update(rawBody, "utf8").digest("hex")

  // Route the simulated payload through the same verify + activate functions the
  // real webhook uses (lib/server/payments.ts), never a parallel implementation.
  const fakeRequest = new Request("https://internal.test/api/payments/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-event-name": eventType, "x-signature": signature },
    body: rawBody,
  })

  try {
    const payment = verifyAndExtractPayment(fakeRequest, rawBody)
    const result = await recordPaymentWebhook(payment)

    const [userRow] = await supabaseSelect<{ plan: string; plan_expires_at: string | null }>(
      "users",
      `id=eq.${encodeURIComponent(userId)}&select=plan,plan_expires_at&limit=1`
    ).catch(() => [])

    return NextResponse.json({
      ok: true,
      eventType,
      transactionId: payment.transactionId,
      subscriptionId,
      status: payment.status,
      result,
      activatedPlan: userRow?.plan ?? null,
      planExpiresAt: userRow?.plan_expires_at ?? null,
    })
  } catch (error) {
    const message = (error as Error).message || "test_webhook_failed"
    return NextResponse.json({ ok: false, error: message }, { status: 422 })
  }
}
