import { getPlanLimits, type PlanLimits, type PlanTier } from "@/lib/entitlements"
import { supabaseSelect } from "@/lib/server/supabase-rest"
import type { WorkspacePlanInfo } from "@/lib/server/workspace"

export type FeatureFlags = Partial<Record<
  | "scheduling"
  | "voiceProfiles"
  | "analytics"
  | "carouselBuilder"
  | "competitorResearch"
  | "approvalWorkflow"
  | "exportPdf"
  | "whiteLabel",
  boolean
>>

export type UserOverrideRow = {
  id: string
  user_id: string
  plan_override: PlanTier | null
  draft_limit_override: number | null
  workspace_limit_override: number | null
  feature_flags: FeatureFlags | null
  notes: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export type EffectiveOverrideInfo = {
  overrideActive: boolean
  effectivePlan: string
  limits: PlanLimits
  featureFlags: FeatureFlags
  override: UserOverrideRow | null
  complimentaryTrialBanner: boolean
  overridePlan: string | null
}

export const getUserIdByEmail = async (email: string) => {
  const users = await supabaseSelect<{ id: string }>(
    "users",
    `email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=id&limit=1`
  )
  return users?.[0]?.id || null
}

export const getUserOverrideByEmail = async (email: string): Promise<UserOverrideRow | null> => {
  // Fetch both internal UUID and external_user_id (LinkedIn provider ID) so we can
  // match whichever one was stored in user_overrides.user_id by the admin panel.
  const users = await supabaseSelect<{ id: string; external_user_id: string | null }>(
    "users",
    `email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=id,external_user_id&limit=1`
  )
  const user = users?.[0]
  if (!user) return null

  const ids = [user.id, user.external_user_id].filter(Boolean) as string[]
  // Try each ID - overrides can be stored under either the internal UUID or the OAuth provider ID
  for (const uid of ids) {
    const rows = await supabaseSelect<UserOverrideRow>(
      "user_overrides",
      `user_id=eq.${encodeURIComponent(uid)}&select=*&limit=1`
    ).catch((error) => {
      if ((error as Error).message === "schema_not_applied") return []
      throw error
    })
    const override = rows?.[0] || null
    if (!override) continue
    if (override.expires_at && new Date(override.expires_at).getTime() <= Date.now()) return null
    return override
  }
  return null
}

export const applyOverrideToLimits = (basePlan: string, override: UserOverrideRow | null): EffectiveOverrideInfo => {
  const featureFlags = override?.feature_flags || {}
  const effectivePlan = override?.plan_override || basePlan || "Free"
  const limits = { ...getPlanLimits(effectivePlan) }
  if (override?.draft_limit_override !== null && override?.draft_limit_override !== undefined) {
    limits.aiDraftsPerMonth = override.draft_limit_override
  }
  if (override?.workspace_limit_override !== null && override?.workspace_limit_override !== undefined) {
    limits.clientWorkspaces = override.workspace_limit_override
  }
  if (featureFlags.scheduling !== undefined) limits.scheduling = featureFlags.scheduling
  if (featureFlags.analytics !== undefined) limits.analyticsDepth = featureFlags.analytics ? "full" : "basic"
  if (featureFlags.carouselBuilder !== undefined) limits.carouselGenerationsPerMonth = featureFlags.carouselBuilder ? 10 : 0
  if (featureFlags.competitorResearch !== undefined) limits.researchRunsPerMonth = featureFlags.competitorResearch ? 5 : 0
  if (featureFlags.approvalWorkflow !== undefined) limits.approvals = featureFlags.approvalWorkflow
  if (featureFlags.exportPdf !== undefined) limits.canExport = featureFlags.exportPdf
  const createdAt = override?.created_at ? new Date(override.created_at).getTime() : Date.now()
  const complimentaryTrialBanner = Boolean(override?.plan_override && Date.now() - createdAt >= 1000 * 60 * 60 * 24 * 14)
  return { overrideActive: Boolean(override), effectivePlan, limits, featureFlags, override, complimentaryTrialBanner, overridePlan: override?.plan_override || null }
}

export const applyUserOverrides = async (planInfo: WorkspacePlanInfo, email?: string | null) => {
  if (!email) return { ...planInfo, ...applyOverrideToLimits(planInfo.plan, null) }
  const override = await getUserOverrideByEmail(email)
  const effective = applyOverrideToLimits(planInfo.plan, override)
  return { ...planInfo, plan: effective.effectivePlan, ...effective }
}
