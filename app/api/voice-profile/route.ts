import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { SupabaseVoiceProfileRepository } from "@/lib/repositories/supabase/SupabaseVoiceProfileRepository"

const voiceRepo = new SupabaseVoiceProfileRepository()

const isValidLinkedInUrl = (value: string) =>
  /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[A-Za-z0-9-_%]+\/?$/.test(value)

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const profile = await voiceRepo.get(workspaceId)
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
    const trimmedLinkedinUrl = typeof linkedinUrl === "string" ? linkedinUrl.trim() : ""

    if (trimmedLinkedinUrl && !isValidLinkedInUrl(trimmedLinkedinUrl)) {
      return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })
    }

    const profile = await voiceRepo.save(workspaceId, {
      name, title, industry, tone, goals, samplePosts,
      linkedinUrl: trimmedLinkedinUrl || null,
    })
    return NextResponse.json({ profile })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: (msg === "auth_required" || msg === "Unauthorized") ? 401 : 500 })
  }
}
