import "server-only"

import crypto from "node:crypto"
import { env } from "@/lib/server/env"
import { LEMONSQUEEZY_VARIANT_PLANS } from "@/lib/server/lemon-variant-plans"
import { getCareerAddonVariantId, getCareerAddonVariantReadiness } from "@/lib/server/career-addon-variants"
import type { CareerProductKey } from "@/lib/career-pricing"

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1"
const LEMONSQUEEZY_STORE_ID = "366761"

type CareerAddonCheckoutParams = {
  addonKey: CareerProductKey
  name: string
  unit: string
  unitPricePkr: number
  quantity: number
  token: string
  email?: string | null
}

export type LemonSqueezyCancelResult = {
  status: string | null
  endsAt: string | null
}

export const isCareerAddonCheckoutConfigured = () =>
  Boolean(env.lemonSqueezyApiKey && getCareerAddonVariantReadiness().ready)

export async function createCareerAddonCheckout(params: CareerAddonCheckoutParams): Promise<string> {
  if (!isCareerAddonCheckoutConfigured()) throw new Error("career_addon_checkout_not_configured")
  if (!Number.isInteger(params.unitPricePkr) || params.unitPricePkr < 1) throw new Error("invalid_career_addon_price")
  if (!Number.isInteger(params.quantity) || params.quantity < 1 || params.quantity > 20) throw new Error("invalid_career_addon_quantity")

  const variantId = getCareerAddonVariantId(params.addonKey)
  if (!variantId) throw new Error("career_addon_variant_not_configured")
  const response = await fetch(`${LEMONSQUEEZY_API_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.lemonSqueezyApiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          product_options: {
            name: params.name,
            description: `One ${params.unit}, generated and saved inside Qalam.`,
            redirect_url: `${env.frontendOrigin}/career/add-ons?checkout=success`,
            enabled_variants: [Number(variantId)],
          },
          checkout_options: { embed: false, media: false, logo: true, desc: true, discount: false },
          checkout_data: {
            ...(params.email ? { email: params.email } : {}),
            custom: { kind: "career_addon", token: params.token },
            variant_quantities: [{ variant_id: Number(variantId), quantity: params.quantity }],
          },
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        relationships: {
          store: { data: { type: "stores", id: LEMONSQUEEZY_STORE_ID } },
          variant: { data: { type: "variants", id: variantId } },
        },
      },
    }),
  })

  const json = await response.json().catch(() => null) as {
    data?: { attributes?: { url?: string } }
    errors?: { detail?: string }[]
  } | null
  if (!response.ok) throw new Error(`career_addon_checkout_failed: ${json?.errors?.[0]?.detail || response.statusText}`)

  const rawUrl = json?.data?.attributes?.url
  if (!rawUrl) throw new Error("career_addon_checkout_url_missing")
  const url = new URL(rawUrl)
  if (url.protocol !== "https:" || url.hostname !== "byqalam.lemonsqueezy.com") throw new Error("career_addon_checkout_url_invalid")
  return url.toString()
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
