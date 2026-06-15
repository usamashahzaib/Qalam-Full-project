import "server-only"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus, incrementUsage as doIncrementUsage } from "@/lib/server/plan-limits-v2"
import { PLAN_CONFIG } from "@/lib/pricing"
import type { PlanTier } from "@/types/domain"
import type {
  IPlanUsageRepository,
  Feature,
  PlanStatus,
  IncrementResult,
} from "@/lib/repositories/interfaces"

export class SupabasePlanUsageRepository implements IPlanUsageRepository {
  async getUsage(userId: string): Promise<PlanStatus> {
    return getPlanStatus(userId)
  }

  async incrementUsage(userId: string, feature: Feature): Promise<IncrementResult> {
    return doIncrementUsage(userId, feature)
  }

  getLimits(plan: PlanTier): Record<Feature, number> {
    return { ...PLAN_CONFIG[plan].limits }
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
