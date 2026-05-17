import { randomUUID } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceKey, requireAppSession } from "@/lib/server/app-session"
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

type WorkspaceJob = {
  id: string
  workspace_key: string
  job_type: string
  status: string
  title: string
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
    const workspaceKey = session.email
    if (!body.sourceText?.trim()) {
      return NextResponse.json({ error: "competitor_source_missing" }, { status: 400 })
    }

    const analysis = await analyzeCompetitorPaste({
      sourceText: body.sourceText,
      profileName: body.profileName || "",
    })

    let job: WorkspaceJob | null = null
    try {
      const rows = await supabaseInsert<WorkspaceJob>("workspace_jobs", {
        id: randomUUID(),
        workspace_key: workspaceKey,
        job_type: "competitor_analysis",
        status: "completed",
        title: `${body.profileName || "Competitor"} analysis`,
        payload: {
          profileId: body.profileId || null,
          profileName: body.profileName || null,
          platform: body.platform || "linkedin",
          sourceText: body.sourceText,
          analysis,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
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
