import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"

type DbVoiceProfile = {
  id: string
  workspace_id: string
  name: string | null
  title: string | null
  industry: string | null
  tone: string | null
  goals: string[] | null
  sample_posts: string[] | null
  linkedin_url?: string | null
  updated_at: string
}

const toClientProfile = (profile?: DbVoiceProfile | null) => ({
  name: profile?.name ?? "",
  title: profile?.title ?? "",
  industry: profile?.industry ?? "",
  tone: profile?.tone ?? "",
  goals: Array.isArray(profile?.goals) ? profile!.goals : [],
  samplePosts: Array.isArray(profile?.sample_posts) ? profile!.sample_posts : [],
  linkedinUrl: profile?.linkedin_url ?? "",
})

const isValidLinkedInUrl = (value: string) =>
  /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9-_%]+\/?$/.test(value)

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const profileRows = await supabaseSelect<DbVoiceProfile>("voice_profiles", `workspace_id=eq.${workspaceId}&limit=1`)
    const profileRow = profileRows?.[0] ?? null
    const profile = profileRow ? toClientProfile(profileRow) : null
    return NextResponse.json({ profile })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const { name, title, industry, tone, goals, samplePosts, linkedinUrl } = body
    const updatedAt = new Date().toISOString()
    const trimmedLinkedinUrl = typeof linkedinUrl === "string" ? linkedinUrl.trim() : ""

    if (trimmedLinkedinUrl && !isValidLinkedInUrl(trimmedLinkedinUrl)) {
      return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })
    }

    const payload = {
      workspace_id: workspaceId,
      name: name ?? null,
      title: title ?? null,
      industry: industry ?? null,
      tone: tone ?? null,
      goals: Array.isArray(goals) ? goals.filter(Boolean) : [],
      sample_posts: Array.isArray(samplePosts) ? samplePosts : [],
      linkedin_url: trimmedLinkedinUrl || null,
      updated_at: updatedAt,
    }

    let profileRows: DbVoiceProfile[] | null = null
    try {
      profileRows = await supabaseUpsert<DbVoiceProfile>(
        "voice_profiles",
        payload,
        "workspace_id"
      )
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("linkedin_url")) throw error
      const { linkedin_url: _linkedinUrl, ...fallbackPayload } = payload
      profileRows = await supabaseUpsert<DbVoiceProfile>("voice_profiles", fallbackPayload, "workspace_id")
    }

    return NextResponse.json({
      profile: toClientProfile(profileRows?.[0] ?? null),
    })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}
