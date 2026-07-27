import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { authorizeRole } from "@/lib/server/roles"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id: postId, versionId } = await context.params
    const supabase = createServiceClient()

    // Verify workspace membership
    const { data: post } = await supabase
      .from("posts")
      .select("workspace_id, content")
      .eq("id", postId)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const roleError = await authorizeRole(req, post.workspace_id, "editor")
    if (roleError) return roleError

    // Fetch the target version
    const { data: version } = await supabase
      .from("post_versions")
      .select("content, version_number")
      .eq("id", versionId)
      .eq("post_id", postId)
      .maybeSingle()

    if (!version) return NextResponse.json({ error: "version_not_found" }, { status: 404 })

    // Snapshot current content before restoring
    const { error: rpcErr } = await supabase.rpc("update_post_with_version", {
      p_post_id: postId,
      p_workspace_id: post.workspace_id,
      p_new_content: version.content,
      p_created_by: user.id,
    })

    if (rpcErr) {
      // RPC not deployed yet - fall back to direct post update
      const { error: directErr } = await supabase
        .from("posts")
        .update({ content: version.content, updated_at: new Date().toISOString() })
        .eq("id", postId)
        .eq("workspace_id", post.workspace_id)
      if (directErr) return NextResponse.json({ error: "restore_failed: " + directErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, restored_version: version.version_number })
  })(request)
}
