import type { AddonKey } from "@/lib/career-pricing"

// Hosted checkout links, one per career add-on product in the Lemon Squeezy store.
// Not secret - safe in a shared module, same pattern as LEMONSQUEEZY_CHECKOUT_URLS
// in lib/pricing.ts. Unset (undefined) until the corresponding product exists in
// the dashboard, in which case checkout for that add-on is simply unavailable and
// the UI falls back to the manual payment-proof flow.
export const CAREER_ADDON_CHECKOUT_URLS: Partial<Record<AddonKey, string>> = {
  extra_resume: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_EXTRA_RESUME_URL,
  cover_letter: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_COVER_LETTER_URL,
  interview_pack: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_INTERVIEW_PACK_URL,
  recruiter_review: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_RECRUITER_REVIEW_URL,
  linkedin_rewrite: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_LINKEDIN_REWRITE_URL,
  career_consultation: process.env.NEXT_PUBLIC_LEMONSQUEEZY_ADDON_CAREER_CONSULTATION_URL,
}

export const isAddonSelfServe = (addonKey: string): boolean =>
  Boolean(CAREER_ADDON_CHECKOUT_URLS[addonKey as AddonKey])

/**
 * Builds a Lemon Squeezy hosted checkout URL for one career add-on order.
 * `token` binds the checkout to a specific pending career_addon_orders row
 * (see signAddonCheckoutToken) - the webhook trusts only that token and the
 * order's own trusted variant->addon mapping, never checkout[custom][addon_key]
 * or checkout[custom][quantity], which a buyer could edit before paying.
 */
export function getCareerAddonCheckoutUrl(
  addonKey: string,
  params: { quantity: number; token: string; email?: string | null }
): string | null {
  const base = CAREER_ADDON_CHECKOUT_URLS[addonKey as AddonKey]
  if (!base) return null

  let checkout: URL
  try {
    checkout = new URL(base)
    if (checkout.protocol !== "https:" || checkout.hostname !== "byqalam.lemonsqueezy.com") return null
  } catch {
    return null
  }

  const search = new URLSearchParams()
  search.set("checkout[quantity]", String(Math.max(1, Math.min(20, params.quantity))))
  if (params.email) search.set("checkout[email]", params.email)
  search.set("checkout[custom][token]", params.token)
  search.set("checkout[custom][kind]", "career_addon")
  return `${base}?${search.toString()}`
}
