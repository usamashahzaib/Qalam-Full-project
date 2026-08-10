import { CAREER_ADD_ONS } from "@/lib/career-pricing"

export const CAREER_ADDON_CHECKOUT_LIVE = process.env.NEXT_PUBLIC_CAREER_ADDON_CHECKOUT_LIVE === "true"

export const isAddonSelfServe = (addonKey: string): boolean =>
  CAREER_ADDON_CHECKOUT_LIVE && CAREER_ADD_ONS.some((addon) => addon.key === addonKey)
