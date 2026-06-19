import "server-only"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type {
  ICompetitorRepository,
  CompetitorAnalysis,
  CompetitorAnalysisRecord,
} from "@/lib/repositories/interfaces"

export class SupabaseCompetitorRepository implements ICompetitorRepository {
  async saveAnalysis(
    userId: string,
    postText: string,
    postUrl: string | null,
    analysis: CompetitorAnalysis
  ): Promise<void> {
    const supabase = createServiceClient()
    await supabase.from("competitor_analyses").insert({
      user_id: userId,
      post_text: postText.slice(0, 2000),
      post_url: postUrl || null,
      hook_structure: analysis.hookStructure,
      engagement_factors: analysis.engagementFactors,
      content_pattern: analysis.contentPattern,
      improvements: analysis.improvements,
    })
  }

  async listAnalyses(userId: string, limit = 5): Promise<CompetitorAnalysisRecord[]> {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("competitor_analyses")
      .select(
        "id, post_text, post_url, hook_structure, engagement_factors, content_pattern, improvements, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit)
    return (data as CompetitorAnalysisRecord[]) || []
  }

  async getRunsUsed(userId: string): Promise<number> {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from("plan_usage")
      .select("competitor_runs_used")
      .eq("user_id", userId)
      .maybeSingle()
    return (data as { competitor_runs_used?: number } | null)?.competitor_runs_used ?? 0
  }

  /**
   * Atomically increment competitor_runs_used only if current value is below the limit.
   * Uses a CAS (compare-and-swap) retry loop to prevent TOCTOU race conditions where
   * concurrent requests could both pass a separate read+check and exceed the quota.
   * Returns true if the increment succeeded (request allowed), false if limit was hit.
   */
  async atomicIncrementIfAllowed(userId: string, limit: number): Promise<boolean> {
    const supabase = createServiceClient()
    const MAX_ATTEMPTS = 3
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { data: row } = await supabase
        .from("plan_usage")
        .select("competitor_runs_used")
        .eq("user_id", userId)
        .maybeSingle()
      const current = (row as { competitor_runs_used?: number } | null)?.competitor_runs_used ?? 0
      if (current >= limit) return false
      // Conditional update: only succeeds if value hasn't changed since we read it.
      const { data: updated } = await supabase
        .from("plan_usage")
        .update({ competitor_runs_used: current + 1 })
        .eq("user_id", userId)
        .eq("competitor_runs_used", current)
        .select("competitor_runs_used")
        .maybeSingle()
      if (updated) return true
      // Another concurrent request modified the row — retry.
    }
    return false
  }

  async setRunsUsed(userId: string, count: number): Promise<void> {
    const supabase = createServiceClient()
    await supabase
      .from("plan_usage")
      .update({ competitor_runs_used: Math.max(0, count) })
      .eq("user_id", userId)
  }

  async incrementRunsUsed(userId: string, currentCount: number): Promise<void> {
    await this.setRunsUsed(userId, currentCount + 1)
  }
}
