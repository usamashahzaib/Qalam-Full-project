import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  return withAuth(async (_req, user) => {
    const { id: postId, versionId } = await context.params
    const supabase = createServiceClient()

    // Verify workspace membership
    const { data: post } = await supabase
      .from("posts")
      .select("workspace_id, content")
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
      return NextResponse.json({ error: "restore_failed: " + rpcErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, restored_version: version.version_number })
  })(request)
}
