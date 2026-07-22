import "server-only"

import { env } from "@/lib/server/env"

const LEMONSQUEEZY_API_BASE = "https://api.lemonsqueezy.com/v1"

export type LemonSqueezyCancelResult = {
  status: string | null
  endsAt: string | null
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
