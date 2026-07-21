import { NextRequest, NextResponse } from "next/server"
import { requirePlan } from "@/lib/server/require-plan"
import { getWorkspaceSessionContext, resolveWorkspaceId } from "@/lib/server/workspace"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { storeVoiceExamples } from "@/lib/server/embeddings"
import { requireAuth } from "@/lib/server/workspace"

export async function POST(request: NextRequest) {
  // Basic identity (name, title, industry, goals) is free for all authenticated users.
  // Voice training (example_posts, characteristics) requires Pro.
  const userId = await requireAuth().catch(() => null)
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

  let session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
  let workspaceId: string
  try {
    session = await getWorkspaceSessionContext()
    workspaceId = await resolveWorkspaceId(request)
    await requireRole(request, workspaceId, "editor")
  } catch (err) {
    const msg = (err as Error).message || "server_error"
    return NextResponse.json({ error: msg }, { status: msg === "forbidden" ? 403 : 401 })
  }

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const hasVoiceTraining = Boolean(body.examplePosts || body.characteristics)

  // Only gate voice training on Pro - basic identity is always allowed
  if (hasVoiceTraining) {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
  }

  const profile = {
    user_id: session.supabaseUserId,
    workspace_id: workspaceId,
    name: String(body.name || "").trim(),
    title: String(body.title || "").trim(),
    industry: String(body.industry || "").trim(),
    linkedin_url: String(body.linkedinUrl || "").trim(),
    brand_tone: String(body.brandTone || "").trim(),
    goals: String(body.goals || "").trim(),
    ...(hasVoiceTraining ? {
      example_posts: String(body.examplePosts || "").trim() || null,
      characteristics: body.characteristics || null,
    } : {}),
    updated_at: new Date().toISOString(),
  }

  const supabase = createServiceClient()
  // Same scoping fix as GET /api/voice/me - only fall back to a bare user_id
  // match for pre-migration rows with no workspace_id, so this never updates
  // a different workspace's profile for users in more than one workspace.
  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("id")
    .or(`workspace_id.eq.${workspaceId},and(workspace_id.is.null,user_id.eq.${session.supabaseUserId})`)
    .limit(1)
    .maybeSingle()

  const { error } = existing?.id
    ? await supabase.from("voice_profiles").update(profile).eq("id", existing.id)
    : await supabase.from("voice_profiles").insert(profile)

  if (error) {
    console.error("voice_save_failed", error)
    return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 })
  }

  if (hasVoiceTraining && profile.example_posts) {
    storeVoiceExamples(workspaceId, session.supabaseUserId, profile.example_posts)
      .catch((err) => console.error("voice_examples_store_failed", err))
  }

  return NextResponse.json({ success: true })
}
