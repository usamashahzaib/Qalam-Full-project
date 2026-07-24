import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { LEMONSQUEEZY_VARIANT_PLANS } from "@/lib/pricing"

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1"
const LEMONSQUEEZY_STORE_ID = "366761"

export type LemonSqueezyCancelResult = {
  status: string | null
  endsAt: string | null
}

export async function createReferralDiscountCode(discountPercent: number): Promise<string> {
  if (!env.lemonSqueezyApiKey) throw new Error("lemonsqueezy_api_key_not_configured")
  if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
    throw new Error("invalid_referral_discount")
  }

  const code = `QREF${crypto.randomBytes(8).toString("hex").toUpperCase()}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const res = await fetch(`${LEMONSQUEEZY_API_BASE}/discounts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.lemonSqueezyApiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "discounts",
        attributes: {
          name: "Referral checkout",
          code,
          amount: discountPercent,
          amount_type: "percent",
          duration: "once",
          is_limited_to_products: true,
          is_limited_redemptions: true,
          max_redemptions: 1,
          expires_at: expiresAt,
        },
        relationships: {
          store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
          variants: {
            data: Object.keys(LEMONSQUEEZY_VARIANT_PLANS).map((id) => ({ type: "variants", id })),
          },
        },
      },
    }),
  })

  const json = await res.json().catch(() => null) as {
    data?: { attributes?: { code?: string } }
    errors?: { detail?: string }[]
  } | null
  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || res.statusText
    throw new Error(`lemonsqueezy_discount_failed: ${detail}`)
  }

  return json?.data?.attributes?.code || code
}

/**
 * Cancels a Lemon Squeezy subscription via PATCH .../subscriptions/{id} with
 * cancelled:true. This stops auto-renewal but does NOT revoke access early -
 * the subscription stays active until its current period end, matching the
 * subscription_cancelled webhook handling in lib/server/payments.ts (which
 * only updates plan_expires_at, never drops the account to Free immediately).
 */
export async function cancelLemonSqueezySubscription(subscriptionId: string): Promise<LemonSqueezyCancelResult> {
  if (!env.lemonSqueezyApiKey) throw new Error("lemonsqueezy_api_key_not_configured")

  const res = await fetch(`${LEMONSQUEEZY_API_BASE}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${env.lemonSqueezyApiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "subscriptions",
        id: subscriptionId,
        attributes: { cancelled: true },
      },
    }),
  })

  const json = await res.json().catch(() => null) as { data?: { attributes?: Record<string, unknown> }; errors?: { detail?: string }[] } | null

  if (!res.ok) {
    const detail = json?.errors?.[0]?.detail || res.statusText
    throw new Error(`lemonsqueezy_cancel_failed: ${detail}`)
  }

  const attrs = json?.data?.attributes ?? {}
  return {
    status: typeof attrs.status === "string" ? attrs.status : null,
    endsAt: typeof attrs.ends_at === "string" ? attrs.ends_at : typeof attrs.renews_at === "string" ? attrs.renews_at : null,
  }
}
