import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { createServiceClient, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminOps(request)
  } catch {
    return notFound()
  }
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const posts = await supabaseSelect(
    "posts",
    `status=eq.publishing&updated_at=lt.${encodeURIComponent(cutoff)}&select=id,workspace_id,user_id,title,content,scheduled_for,updated_at,linkedin_post_id&order=updated_at.asc&limit=100`
  )
  return NextResponse.json({ posts })
}

export async function PATCH(request: NextRequest) {
  let admin: Awaited<ReturnType<typeof requireAdminOps>>
  try {
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const postId = String(body?.postId || "").trim()
  const resolution = String(body?.resolution || "").trim()
  const postUrn = String(body?.postUrn || "").trim() || null
  const note = String(body?.note || "").trim()
  if (!postId || !["published", "not_published"].includes(resolution)) {
    return NextResponse.json({ error: "invalid_resolution" }, { status: 400 })
  }
  if (note.length < 3 || note.length > 1000) {
    return NextResponse.json({ error: "review_note_required" }, { status: 400 })
  }

  const service = createServiceClient()
  const { data, error } = await service.rpc("resolve_publish_outcome_review", {
    p_post_id: postId,
    p_resolution: resolution,
    p_post_urn: postUrn,
    p_note: note,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "publish_review_no_longer_pending" }, { status: 409 })

  await supabaseInsert("admin_audit_log", {
    admin_email: admin.email,
    target_user_email: `post:${postId}`,
    action: "resolve_publish_outcome",
    old_value: { status: "publishing" },
    new_value: { status: resolution === "published" ? "published" : "failed", postUrn, note },
  }, "return=minimal")

  return NextResponse.json({ ok: true })
}
