import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id: postId } = await context.params
    const supabase = createServiceClient()

    // Verify user has access to this post's workspace
    const { data: post } = await supabase
      .from("posts")
      .select("workspace_id")
      .eq("id", postId)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", post.workspace_id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 })

    const { data: versions, error } = await supabase
      .from("post_versions")
      .select("id, version_number, content, edit_delta_percent, created_by, created_at")
      .eq("post_id", postId)
      .order("version_number", { ascending: false })
      .limit(50)

    // Graceful degradation: post_versions table may not exist yet (migration pending)
    if (error?.code === "42P01") return NextResponse.json({ versions: [], pending_migration: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ versions: versions ?? [] })
  })(request)
}
