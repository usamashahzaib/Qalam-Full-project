import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { supabaseSelect, createServiceClient } from "@/lib/server/supabase-rest"
import { errorToStatus } from "@/lib/server/roles"

type DbPost = {
  id: string
  workspace_id: string
  title: string
  content: string | null
  type: string
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const ctx = await getWorkspaceSessionContext()

    const body = await request.json()
    const postId = String(body.postId || "").trim()
    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

    const rows = await supabaseSelect<DbPost>("posts", `id=eq.${postId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!rows?.length) return NextResponse.json({ error: "not_found" }, { status: 404 })

    const original = rows[0]
    const supabase = createServiceClient()

    const { data: newId, error } = await supabase.rpc("create_post_with_version", {
      p_user_id: userId,
      p_workspace_id: workspaceId,
      p_title: `${original.title} (copy)`,
      p_content: original.content ?? "",
      p_hook: null,
      p_cta: null,
      p_role_profile: null,
      p_topic: original.title,
      p_engagement_score: null,
      p_metadata: { type: original.type, authorId: ctx.supabaseUserId },
      p_status: "draft",
    })

    if (error || !newId) throw new Error(error?.message || "duplicate_failed")

    return NextResponse.json({
      post: {
        id: newId,
        title: `${original.title} (copy)`,
        content: original.content ?? "",
        type: original.type,
        status: "draft",
        date: new Date().toISOString().slice(0, 10),
        scheduledTime: null,
        externalPostUrn: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    }, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
