import "server-only"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus, incrementUsage as doIncrementUsage } from "@/lib/server/plan-limits-v2"
import type { PlanName } from "@/lib/pricing"
import type {
  IPlanUsageRepository,
  Feature,
  PlanStatus,
  IncrementResult,
} from "@/lib/repositories/interfaces"

const PLAN_LIMITS: Record<PlanName, Record<Feature, number>> = {
  Free:   { drafts: 5,   carousels: 1,  hooks: 5,   analyses: 5   },
  Solo:   { drafts: 30,  carousels: 3,  hooks: 30,  analyses: 10  },
  Pro:    { drafts: 60,  carousels: 10, hooks: 60,  analyses: 20  },
  Agency: { drafts: 300, carousels: 50, hooks: 300, analyses: 100 },
}

export class SupabasePlanUsageRepository implements IPlanUsageRepository {
  async getUsage(userId: string): Promise<PlanStatus> {
    return getPlanStatus(userId)
  }

  async incrementUsage(userId: string, feature: Feature): Promise<IncrementResult> {
    return doIncrementUsage(userId, feature)
  }

  getLimits(plan: PlanName): Record<Feature, number> {
    return { ...PLAN_LIMITS[plan] }
  }

  async getDailyActivity(
    userId: string,
    monthStart: string
  ): Promise<{ created_at: string }[]> {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("posts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: true })
    return (data ?? []) as { created_at: string }[]
  }
}
