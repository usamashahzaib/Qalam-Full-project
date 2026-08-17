import { CAREER_ADD_ONS } from "@/lib/career-pricing"

// Both flags are required. This keeps the public UI fail-closed when Vercel has
// a legacy live flag but the private Lemon Squeezy configuration is incomplete.
export const CAREER_ADDON_CHECKOUT_LIVE =
  process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE === "true" &&
  process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_READY === "true"

export const isAddonSelfServe = (addonKey: string): boolean =>
  CAREER_ADDON_CHECKOUT_LIVE && CAREER_ADD_ONS.some((addon) => addon.key === addonKey)
