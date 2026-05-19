import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId, requireAppSession } from "@/lib/server/app-session"
import { analyzeCompetitorPaste } from "@/lib/server/competitors"
import { supabaseInsert } from "@/lib/server/supabase-rest"
import { rateLimit } from "@/lib/server/rate-limit"

type AnalyzeRequest = {
  workspaceKey?: string
  profileId?: string | null
  profileName?: string | null
  platform?: string
  sourceText?: string
}

type Job = {
  id: string
  workspace_id: string
  type: string
  status: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function POST(request: NextRequest) {
  try {
    const session = requireAppSession(request)
    
    // Rate Limit: 5 analysis requests per minute per user
    if (!rateLimit(`analyze_${session.email}`, 5, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 })
    }

    const body = (await request.json()) as AnalyzeRequest
    const workspaceId = await resolveWorkspaceId(request)
    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "competitor_source_missing" }, { status: 400 })
    }

    const analysis = await analyzeCompetitorPaste({
      sourceText: body.sourceText,
      profileName: body.profileName || "",
    })

    let job: Job | null = null
    try {
      const rows = await supabaseInsert<Job>("jobs", {
        workspace_id: workspaceId,
        type: "competitor_analysis",
        status: "completed",
        payload: {
          profileId: body.profileId || null,
          profileName: body.profileName || null,
          platform: body.platform || "linkedin",
          sourceText: body.sourceText,
          analysis,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, "return=representation")
      job = rows?.[0] || null
    } catch {
      // Supabase unavailable — analysis result still returned
    }

    return NextResponse.json({ analysis, job })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
