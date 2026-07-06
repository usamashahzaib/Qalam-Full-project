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
    const body = await request.json()
    const { name, title, industry, tone, goals, samplePosts, linkedinUrl } = body
    const trimmedLinkedinUrl = typeof linkedinUrl === "string" ? linkedinUrl.trim() : ""

    if (trimmedLinkedinUrl && !isValidLinkedInUrl(trimmedLinkedinUrl)) {
      return NextResponse.json({ error: "Use a valid public LinkedIn profile URL." }, { status: 400 })
    }

    // Basic identity (name, title, industry, tone, goals, linkedinUrl) is free for all
    // authenticated users. Only actual voice training (sample posts) requires Pro.
    const hasVoiceTraining = Array.isArray(samplePosts) && samplePosts.length > 0
    if (hasVoiceTraining) {
      const planCheck = await requirePlan(request, "Pro")
      if (!planCheck.ok) return planCheck.response
    } else {
      await requireAuth()
    }
    const workspaceId = await resolveWorkspaceId(request)

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
