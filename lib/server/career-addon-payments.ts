import "server-only"

import { env } from "@/lib/server/env"
import { verifyLemonSqueezy } from "@/lib/server/payments"
import { verifyAddonCheckoutToken } from "@/lib/server/checkout-token"
import { createServiceClient, supabaseSelect } from "@/lib/server/supabase-rest"
import { CAREER_ADD_ONS } from "@/lib/career-pricing"
import { createNotification } from "@/lib/server/notifications"
import { log } from "@/lib/server/logging"

type CareerAddonOrderRow = {
  id: string
  user_id: string
  workspace_id: string
  addon_key: string
  quantity: number
  amount_pkr: number
  status: string
}

/**
 * Cheap, unauthenticated peek used to decide routing before signature
 * verification: is this a career add-on order, or a plan-billing event? The
 * plan-billing pipeline in lib/server/payments.ts has no concept of one-off
 * add-on products and would reject this event, so it must never see it.
 */
export function isCareerAddonWebhook(eventName: string, body: Record<string, unknown>): boolean {
  if (eventName !== "order_created" && eventName !== "order_refunded") return false
  const meta = (body.meta ?? {}) as Record<string, unknown>
  const customData = (meta.custom_data ?? {}) as Record<string, unknown>
  return customData.kind === "career_addon"
}

/**
 * Fulfills a career add-on order paid via Lemon Squeezy. Kept entirely
 * separate from lib/server/payments.ts (plan billing) so this new, simpler
 * order type can never regress the plan-activation pipeline - it re-verifies
 * the Lemon Squeezy signature itself and shares only the idempotency RPC and
 * signature verifier, both already hardened for the plan path.
 */
export async function handleCareerAddonWebhook(
  rawBody: string,
  signature: string | null,
  eventName = "order_created"
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!verifyLemonSqueezy(rawBody, signature, env.lemonSqueezyWebhookSecret)) {
    return { status: 401, body: { ok: false, error: "payment_signature_invalid" } }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody || "{}")
  } catch {
    return { status: 400, body: { ok: false, error: "invalid_payload" } }
  }

  const meta = (body.meta ?? {}) as Record<string, unknown>
  const data = (body.data ?? {}) as Record<string, unknown>
  const attributes = (data.attributes ?? {}) as Record<string, unknown>
  const customData = (meta.custom_data ?? {}) as Record<string, unknown>
  const firstOrderItem = (attributes.first_order_item ?? {}) as Record<string, unknown>

  const lsOrderId = String(data.id || "")
  const token = String(customData.token || "")
  const status = String(attributes.status || "").toLowerCase()
  const variantId = String(firstOrderItem.variant_id ?? attributes.variant_id ?? "")
  const lsQuantity = Number(firstOrderItem.quantity ?? 1)
  const currency = String(attributes.currency || "").toUpperCase()
  const subtotal = Number(attributes.subtotal)
  const discountTotal = Number(attributes.discount_total ?? 0)

  if (!lsOrderId) return { status: 400, body: { ok: false, error: "missing_order_id" } }

  const supabase = createServiceClient()
  const webhookEventId = `${eventName}:${lsOrderId}`
  const { data: claimState, error: claimError } = await supabase.rpc("claim_payment_webhook_v2", {
    p_provider: "lemonsqueezy_career_addon",
    p_event_id: webhookEventId,
  })
  if (claimError) return { status: 503, body: { ok: false, error: "payment_webhook_claim_failed" } }
  if (claimState === "busy") return { status: 503, body: { ok: false, error: "payment_webhook_busy" } }
  if (claimState === "completed") return { status: 200, body: { ok: true, duplicate: true } }

  const fail = async (reason: string) => {
    await supabase
      .from("payment_webhook_events")
      .update({ processing_state: "failed", last_error: reason.slice(0, 2000), updated_at: new Date().toISOString() })
      .eq("provider", "lemonsqueezy_career_addon")
      .eq("event_id", webhookEventId)
    return { status: 422, body: { ok: false, error: reason } }
  }

  const complete = async (result: Record<string, unknown>) => {
    await supabase
      .from("payment_webhook_events")
      .update({ processing_state: "completed", processed_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq("provider", "lemonsqueezy_career_addon")
      .eq("event_id", webhookEventId)
    return { status: 200, body: { ok: true, ...result } }
  }

  if (eventName === "order_refunded") {
    const fullyRefunded = status === "refunded" || attributes.refunded === true
    if (!fullyRefunded) return complete({ ignored: true, reason: "partial_refund" })
    const verifiedRefund = verifyAddonCheckoutToken(token)
    const lookup = supabase.from("career_addon_orders").select("id, user_id, workspace_id, addon_key, quantity, amount_pkr, status")
    const { data: refundedOrder } = verifiedRefund
      ? await lookup.eq("id", verifiedRefund.orderId).eq("user_id", verifiedRefund.userId).maybeSingle<CareerAddonOrderRow>()
      : await lookup.eq("provider_reference", lsOrderId).maybeSingle<CareerAddonOrderRow>()
    if (!refundedOrder) return fail("addon_refund_order_not_found")
    const { error: refundError } = await supabase.from("career_addon_orders").update({ status: "refunded", updated_at: new Date().toISOString() }).eq("id", refundedOrder.id)
    if (refundError) return fail("addon_refund_update_failed")
    await createNotification({
      userId: refundedOrder.user_id,
      workspaceId: refundedOrder.workspace_id,
      type: "career_addon_paid",
      title: "Career add-on refunded",
      body: "Unused credits from this order are no longer available.",
      link: "/career/add-ons",
    })
    return complete({ orderId: refundedOrder.id, refunded: true })
  }

  if (status !== "paid") return complete({ ignored: true, reason: `status_${status || "unknown"}` })

  const verified = verifyAddonCheckoutToken(token)
  if (!verified) return fail("addon_token_invalid_or_expired")

  if (!env.lemonSqueezyCareerAddonBaseVariantId || variantId !== env.lemonSqueezyCareerAddonBaseVariantId) {
    log.error("career_addon_payment.unknown_variant", { variantId, lsOrderId })
    return fail("addon_variant_unrecognized")
  }

  const rows = await supabaseSelect<CareerAddonOrderRow>(
    "career_addon_orders",
    `id=eq.${encodeURIComponent(verified.orderId)}&user_id=eq.${encodeURIComponent(verified.userId)}&select=id,user_id,workspace_id,addon_key,quantity,amount_pkr,status&limit=1`
  )
  const order = rows?.[0]
  if (!order) return fail("addon_order_not_found")
  if (order.quantity !== lsQuantity) {
    log.error("career_addon_payment.quantity_mismatch", { orderId: order.id, expected: order.quantity, paidFor: lsQuantity })
    return fail("addon_quantity_mismatch")
  }
  if (currency !== "PKR" || subtotal !== order.amount_pkr * 100 || discountTotal !== 0) {
    log.error("career_addon_payment.amount_mismatch", { orderId: order.id, currency, subtotal, discountTotal })
    return fail("addon_amount_mismatch")
  }
  if (order.status !== "pending") return complete({ alreadyProcessed: true, orderId: order.id })

  const { error: updateError } = await supabase
    .from("career_addon_orders")
    .update({
      status: "paid",
      payment_provider: "lemonsqueezy",
      provider_reference: lsOrderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "pending")

  if (updateError) return fail("addon_order_update_failed")

  const addon = CAREER_ADD_ONS.find((item) => item.key === order.addon_key)
  const link = CAREER_ADD_ONS.find((item) => item.key === order.addon_key)?.route || "/career/add-ons"
  await createNotification({
    userId: order.user_id,
    workspaceId: order.workspace_id,
    type: "career_addon_paid",
    title: "Add-on payment received",
    body: `${addon?.name || order.addon_key} is confirmed. Generate it now inside Qalam.`,
    link,
  })

  return complete({ orderId: order.id })
}
