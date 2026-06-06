import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { supabasePatch, supabaseSelect, supabaseUpsert } from "@/lib/server/supabase-rest"

type DbVoiceProfile = {
  id: string
  workspace_id: string
  name: string | null
  title: string | null
  industry: string | null
  tone: string | null
  goals: string[] | null
  sample_posts: string[] | null
  updated_at: string
}

type DbWorkspace = {
  id: string
  linkedin_url: string | null
}

const toClientProfile = (profile?: DbVoiceProfile | null, workspace?: DbWorkspace | null) => ({
  name: profile?.name ?? "",
  title: profile?.title ?? "",
  industry: profile?.industry ?? "",
  tone: profile?.tone ?? "",
  goals: Array.isArray(profile?.goals) ? profile!.goals : [],
  samplePosts: Array.isArray(profile?.sample_posts) ? profile!.sample_posts : [],
  linkedinUrl: workspace?.linkedin_url ?? "",
})

const isValidLinkedInUrl = (value: string) =>
  /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9-_%]+\/?$/.test(value)

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const [profileRows, workspaceRows] = await Promise.all([
      supabaseSelect<DbVoiceProfile>("voice_profiles", `workspace_id=eq.${workspaceId}&limit=1`),
      supabaseSelect<DbWorkspace>("workspaces", `id=eq.${workspaceId}&select=id,linkedin_url&limit=1`),
    ])

    const profileRow = profileRows?.[0] ?? null
    const workspaceRow = workspaceRows?.[0] ?? null
    const profile = profileRow || workspaceRow?.linkedin_url ? toClientProfile(profileRow, workspaceRow) : null
    return NextResponse.json({ profile })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const { name, title, industry, tone, goals, samplePosts, linkedinUrl } = body
    const updatedAt = new Date().toISOString()
    const trimmedLinkedinUrl = typeof linkedinUrl === "string" ? linkedinUrl.trim() : ""

    if (trimmedLinkedinUrl && !isValidLinkedInUrl(trimmedLinkedinUrl)) {
      return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })
    }

    const [profileRows, workspaceRows] = await Promise.all([
      supabaseUpsert<DbVoiceProfile>(
        "voice_profiles",
        {
          workspace_id: workspaceId,
          name: name ?? null,
          title: title ?? null,
          industry: industry ?? null,
          tone: tone ?? null,
          goals: Array.isArray(goals) ? goals.filter(Boolean) : [],
          sample_posts: Array.isArray(samplePosts) ? samplePosts : [],
          updated_at: updatedAt,
        },
        "workspace_id"
      ),
      supabasePatch<DbWorkspace>(
        "workspaces",
        `id=eq.${workspaceId}`,
        {
          linkedin_url: trimmedLinkedinUrl || null,
          updated_at: updatedAt,
        }
      ),
    ])

    return NextResponse.json({
      profile: toClientProfile(profileRows?.[0] ?? null, workspaceRows?.[0] ?? null),
    })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}
