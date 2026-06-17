import { NextResponse } from "next/server"
import { requirePlan } from "@/lib/server/require-plan"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const planCheck = await requirePlan(request, "Pro")
  if (!planCheck.ok) return planCheck.response

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("voice_profiles")
    .select("name, title, industry, linkedin_url, brand_tone, goals, example_posts, characteristics, sample_posts, voice_fingerprint, updated_at")
    .or(`workspace_id.eq.${planCheck.workspaceId},user_id.eq.${planCheck.session.supabaseUserId}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Failed to load voice profile" }, { status: 500 })
  }

  return NextResponse.json({ profile: data || null })
}
