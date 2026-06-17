import { NextRequest, NextResponse } from "next/server"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function POST(request: NextRequest) {
  const planCheck = await requirePlan(request, "Pro")
  if (!planCheck.ok) return planCheck.response

  let body: Record<string, unknown>
  try { body = await request.json() } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const profile = {
    user_id: planCheck.session.supabaseUserId,
    workspace_id: planCheck.workspaceId,
    name: String(body.name || "").trim(),
    title: String(body.title || "").trim(),
    industry: String(body.industry || "").trim(),
    linkedin_url: String(body.linkedinUrl || "").trim(),
    brand_tone: String(body.brandTone || "").trim(),
    tone: String(body.brandTone || "").trim(),
    goals: String(body.goals || "").trim(),
    example_posts: String(body.examplePosts || "").trim() || null,
    characteristics: body.characteristics || null,
    updated_at: new Date().toISOString(),
  }

  const supabase = createServiceClient()
  const { data: existing } = await supabase
    .from("voice_profiles")
    .select("id")
    .or(`workspace_id.eq.${planCheck.workspaceId},user_id.eq.${planCheck.session.supabaseUserId}`)
    .limit(1)
    .maybeSingle()

  const { error } = existing?.id
    ? await supabase.from("voice_profiles").update(profile).eq("id", existing.id)
    : await supabase.from("voice_profiles").insert(profile)

  if (error) {
    console.error("voice_save_failed", error)
    return NextResponse.json({ error: "Failed to save voice profile" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
