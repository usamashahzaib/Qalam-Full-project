import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { authorizeRole } from "@/lib/server/roles"

const createSchema = z.object({
  postId: z.string().uuid().optional(),
  impressions: z.number().int().min(0).default(0),
  reactions: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  reposts: z.number().int().min(0).default(0),
  followerDelta: z.number().int().default(0),
  notes: z.string().max(500).optional(),
  capturedAt: z.string().datetime().optional(),
})

export async function GET(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }
    const { requirePlan } = await import("@/lib/server/require-plan")
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    if (planCheck.limits.analyticsDepth === "none") {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "analytics" }, { status: 403 })
    }

    const url = new URL(req.url)
    const postId = url.searchParams.get("postId")
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200)

    const supabase = createServiceClient()
    let query = supabase
      .from("analytics_snapshots")
      .select("id, post_id, impressions, reactions, comments, reposts, follower_delta, notes, captured_at")
      .eq("workspace_id", user.workspaceId)
      .order("captured_at", { ascending: false })
      .limit(limit)

    if (postId) {
      query = query.eq("post_id", postId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ snapshots: data ?? [] })
  })(request)
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }
    const roleError = await authorizeRole(req, user.workspaceId, "editor")
    if (roleError) return roleError
    const { requirePlan } = await import("@/lib/server/require-plan")
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    if (planCheck.limits.analyticsDepth === "none") {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "analytics" }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { postId, impressions, reactions, comments, reposts, followerDelta, notes, capturedAt } = parsed.data

    // If postId provided, verify it belongs to this workspace
    if (postId) {
      const supabase = createServiceClient()
      const { data: post } = await supabase
        .from("posts")
        .select("id")
        .eq("id", postId)
        .eq("workspace_id", user.workspaceId)
        .maybeSingle()
      if (!post) return NextResponse.json({ error: "post_not_found_in_workspace" }, { status: 404 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("analytics_snapshots")
      .insert({
        post_id: postId ?? null,
        workspace_id: user.workspaceId,
        user_id: user.id,
        impressions,
        reactions,
        comments,
        reposts,
        follower_delta: followerDelta,
        notes: notes ?? null,
        captured_at: capturedAt ?? new Date().toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ snapshot: data }, { status: 201 })
  })(request)
}

export async function DELETE(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!user.workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 })
    }
    const roleError = await authorizeRole(req, user.workspaceId, "editor")
    if (roleError) return roleError
    const { requirePlan } = await import("@/lib/server/require-plan")
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    if (planCheck.limits.analyticsDepth === "none") {
      return NextResponse.json({ error: "upgrade_required", requiredFeature: "analytics" }, { status: 403 })
    }

    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("analytics_snapshots")
      .delete()
      .eq("id", id)
      .eq("workspace_id", user.workspaceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
