import "server-only"

import { CAREER_PRODUCTS, type CareerProductKey } from "@/lib/career-pricing"
import { env } from "@/lib/server/env"

const validVariantId = (value: string) => /^[1-9]\d*$/.test(value)

export const getCareerAddonVariantReadiness = () => {
  const entries = CAREER_PRODUCTS.map(({ key }) => [key, env.lemonSqueezyCareerAddonVariantIds[key]] as const)
  const missing = entries.filter(([, id]) => !validVariantId(id)).map(([key]) => key)
  const configuredIds = entries.map(([, id]) => id).filter(validVariantId)
  const duplicateIds = [...new Set(configuredIds.filter((id, index) => configuredIds.indexOf(id) !== index))]
  return { ready: missing.length === 0 && duplicateIds.length === 0, missing, duplicateIds }
}

export const getCareerAddonVariantId = (addonKey: CareerProductKey): string | null => {
  const id = env.lemonSqueezyCareerAddonVariantIds[addonKey]
  return validVariantId(id) ? id : null
}

export const getCareerAddonKeyForVariantId = (variantId: string): CareerProductKey | null => {
  if (!validVariantId(variantId)) return null
  return CAREER_PRODUCTS.find(({ key }) => env.lemonSqueezyCareerAddonVariantIds[key] === variantId)?.key ?? null
}
