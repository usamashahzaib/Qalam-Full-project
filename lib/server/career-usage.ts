import "server-only"

import { createServiceClient } from "@/lib/server/supabase-rest"

type CareerFeature = "linkedin_audit" | "resume_review" | "resume_generation"

const limits: Record<string, Record<CareerFeature, number>> = {
  Free: { linkedin_audit: 1, resume_review: 1, resume_generation: 1 },
  Solo: { linkedin_audit: 3, resume_review: 2, resume_generation: 1 },
  Pro: { linkedin_audit: 20, resume_review: 10, resume_generation: 3 },
  Agency: { linkedin_audit: 100, resume_review: 50, resume_generation: 20 },
}

export const getCareerLimit = (plan: string, feature: CareerFeature) =>
  (limits[plan] || limits.Free)[feature]

export async function consumeCareerUsage(userId: string, plan: string, feature: CareerFeature) {
  const limit = getCareerLimit(plan, feature)
  const { data, error } = await createServiceClient().rpc("consume_career_usage", {
    p_user_id: userId,
    p_feature: feature,
    p_limit: limit,
  })
  if (error) throw new Error("career_usage_unavailable")
  const result = Array.isArray(data) ? data[0] : data
  return {
    allowed: Boolean(result?.allowed),
    used: Number(result?.used || 0),
    limit,
  }
}

export async function consumeExtraResumeCredit(userId: string) {
  const { data, error } = await createServiceClient().rpc("consume_extra_resume_credit", { p_user_id: userId })
  if (error) return false
  return data === true
}
