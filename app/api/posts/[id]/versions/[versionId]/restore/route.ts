import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient, createScopedClient } from "@/lib/server/supabase-rest"
import { authorizeRole } from "@/lib/server/roles"

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; versionId: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Solo")
    if (!planCheck.ok) return planCheck.response

    const { id: postId, versionId } = await context.params
    // Workspace isn't known yet at this point - this lookup is how it gets
    // discovered, so it can't itself be workspace-scoped. Everything after
    // the role check below uses createScopedClient(post.workspace_id) instead.
    const rawSupabase = createServiceClient()

    const { data: post } = await rawSupabase
      .from("posts")
      .select("workspace_id, content")
      .eq("id", postId)
      .maybeSingle()

    if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const roleError = await authorizeRole(req, post.workspace_id, "editor")
    if (roleError) return roleError

    const supabase = createScopedClient(post.workspace_id)

    // post_versions has no workspace_id column of its own (scoped indirectly
    // via post_id, already verified above) - use .raw.
    const { data: versionRaw } = await supabase
      .from("post_versions")
      .raw.select("content, version_number")
      .eq("id", versionId)
      .eq("post_id", postId)
      .maybeSingle()

    if (!versionRaw) return NextResponse.json({ error: "version_not_found" }, { status: 404 })
    const version = versionRaw as unknown as { content: string; version_number: number }

    // Snapshot current content before restoring
    const { error: rpcErr } = await rawSupabase.rpc("update_post_with_version", {
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
      if (directErr) return NextResponse.json({ error: "restore_failed: " + directErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, restored_version: version.version_number })
  })(request)
}
