import "server-only"

import { CAREER_ADD_ONS, type AddonKey } from "@/lib/career-pricing"
import { env } from "@/lib/server/env"

const validVariantId = (value: string) => /^[1-9]\d*$/.test(value)

export const getCareerAddonVariantReadiness = () => {
  const entries = CAREER_ADD_ONS.map(({ key }) => [key, env.lemonSqueezyCareerAddonVariantIds[key]] as const)
  const missing = entries.filter(([, id]) => !validVariantId(id)).map(([key]) => key)
  const configuredIds = entries.map(([, id]) => id).filter(validVariantId)
  const duplicateIds = [...new Set(configuredIds.filter((id, index) => configuredIds.indexOf(id) !== index))]
  return { ready: missing.length === 0 && duplicateIds.length === 0, missing, duplicateIds }
}

export const getCareerAddonVariantId = (addonKey: AddonKey): string | null => {
  const id = env.lemonSqueezyCareerAddonVariantIds[addonKey]
  return validVariantId(id) ? id : null
}

export const getCareerAddonKeyForVariantId = (variantId: string): AddonKey | null => {
  if (!validVariantId(variantId)) return null
  return CAREER_ADD_ONS.find(({ key }) => env.lemonSqueezyCareerAddonVariantIds[key] === variantId)?.key ?? null
}
