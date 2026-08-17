import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { getPlanStatus } from "@/lib/server/plan-limits-v2"
import { scorePost } from "@/lib/use-cases/score-post"
import { verifyCronAuth } from "@/lib/server/verify-cron"

export const maxDuration = 60

const CONCURRENCY = 3
const DEFAULT_BATCH = 15

type BackfillPost = {
  id: string
  user_id: string
  workspace_id: string | null
  content: string | null
  metadata: { type?: string } | null
}

async function processBatch<T, R>(items: T[], fn: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    results.push(...(await Promise.all(batch.map(fn))))
    if (i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 400))
    }
  }
  return results
}

/**
 * One-off backfill for posts saved before scores were persisted (see
 * SupabasePostRepository - engagement_score was never written on create/update
 * until this route's companion fix). Scores every text post that still has a
 * NULL engagement_score. Not a recurring cron - run scripts/backfill-scores.mjs
 * until it reports remaining: 0, then this route can be left in place unused.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || DEFAULT_BATCH))

  const supabase = createServiceClient()

  // Carousel content is a JSON slide array, not prose - the 7-metric prompt
  // doesn't apply, so those are left NULL rather than scored garbage.
  const { data: candidates, error } = await supabase
    .from("posts")
    .select("id,user_id,workspace_id,content,metadata")
    .is("engagement_score", null)
    .not("content", "is", null)
    .not("metadata->>type", "ilike", "%carousel%")
    .order("created_at", { ascending: true })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const posts = (candidates ?? []) as BackfillPost[]
  if (posts.length === 0) {
    return NextResponse.json({ scanned: 0, scored: 0, skipped: 0, failed: 0, remaining: 0 })
  }

  const planCache = new Map<string, string>()
  const resolvePlan = async (userId: string): Promise<string> => {
    if (planCache.has(userId)) return planCache.get(userId) as string
    const plan = await getPlanStatus(userId).then((s) => s.plan).catch(() => "Free")
    planCache.set(userId, plan)
    return plan
  }

  let scored = 0
  let skipped = 0
  let failed = 0

  await processBatch(posts, async (post) => {
    const content = (post.content || "").trim()
    if (content.length < 4) {
      skipped += 1
      return
    }
    try {
      const plan = await resolvePlan(post.user_id)
      const result = await scorePost({
        content,
        userId: post.user_id,
        workspaceId: post.workspace_id,
        plan,
      })
      if (!result.ok) {
        failed += 1
        return
      }
      const { error: updateError } = await supabase
        .from("posts")
        .update({ engagement_score: result.data.overall })
        .eq("id", post.id)
      if (updateError) failed += 1
      else scored += 1
    } catch {
      failed += 1
    }
  }, CONCURRENCY)

  const remaining = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .is("engagement_score", null)
    .not("content", "is", null)
    .not("metadata->>type", "ilike", "%carousel%")
    .then((r) => r.count ?? 0)

  return NextResponse.json({ scanned: posts.length, scored, skipped, failed, remaining })
}
