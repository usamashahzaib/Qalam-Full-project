import { NextResponse } from "next/server"
import { getWorkspaceSessionContext, resolveWorkspaceId, requireAuth } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  // Basic profile is readable for all authenticated users - Pro gate is on voice training fields only
  const userId = await requireAuth().catch(() => null)
  if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

  let session: Awaited<ReturnType<typeof getWorkspaceSessionContext>>
  let workspaceId: string
  try {
    session = await getWorkspaceSessionContext()
    workspaceId = await resolveWorkspaceId(request)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "server_error" }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("voice_profiles")
    .select("name, title, industry, linkedin_url, brand_tone, goals, example_posts, characteristics, sample_posts, voice_fingerprint, updated_at")
    .or(`workspace_id.eq.${workspaceId},user_id.eq.${session.supabaseUserId}`)
    .limit(1)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Failed to load voice profile" }, { status: 500 })
  }

  return NextResponse.json({ profile: data || null })
}
