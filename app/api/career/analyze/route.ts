import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { checkPlanLimit, incrementUsage } from "@/lib/server/plan-limits-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"

const input = z.object({
  tool: z.enum(["linkedin", "resume", "job-match"]),
  profile: z.string().max(8000).default(""),
  resume: z.string().max(12000).default(""),
  jobDescription: z.string().max(8000).default(""),
  targetRole: z.string().max(200).default(""),
})

const prompts = {
  linkedin: "Audit the supplied LinkedIn profile. Return a 0-100 score, dimension scores for positioning/search_relevance/credibility/completeness/story_alignment, a concise diagnosis, 5 prioritized fixes, and headline/about rewrites. Never invent facts.",
  resume: "Build an ATS-safe resume improvement report. Return a clear professional summary, experience rewrites that preserve supplied facts, skills to clarify, chronology or evidence gaps, and an ATS-safe section order. Never invent employers, dates, credentials, or outcomes.",
  "job-match": "Compare the resume to this one job description. Return required criteria with evidence status (supported/unclear/unsupported), prioritized honest rewrites, genuine gaps, and a tailored professional summary. Never suggest unsupported claims or keyword stuffing.",
} as const

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const parsed = input.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return NextResponse.json({ error: "invalid_career_input", details: parsed.error.flatten() }, { status: 400 })
    const body = parsed.data
    if (!body.profile && !body.resume) return NextResponse.json({ error: "profile_or_resume_required" }, { status: 400 })
    if (body.tool === "job-match" && !body.jobDescription) return NextResponse.json({ error: "job_description_required" }, { status: 400 })

    const limit = await checkPlanLimit(planCheck.billingUserId, "analyses")
    if (!limit.allowed) return NextResponse.json({ error: "career_analysis_limit_reached", remaining: 0 }, { status: 403 })

    const raw = await callAi(
      "voice-profile",
      "Return strict JSON only.",
      `${prompts[body.tool]}\n\nTarget role: ${body.targetRole || "Not supplied"}\n\nLinkedIn profile:\n${body.profile || "Not supplied"}\n\nResume:\n${body.resume || "Not supplied"}\n\nJob description:\n${body.jobDescription || "Not supplied"}\n\nOutput JSON: {"summary":"string","score":number,"dimensions":[{"name":"string","score":number,"reason":"string"}],"recommendations":["string"],"rewrites":[{"section":"string","text":"string"}],"gaps":["string"]}`,
      { json: true, temperature: 0.25, timeout: 30000, userId: planCheck.billingUserId, plan: limit.plan, cache: false }
    )
    const result = safeParseJson(raw)
    if (!result) return NextResponse.json({ error: "invalid_ai_response" }, { status: 503 })
    const usage = await incrementUsage(planCheck.billingUserId, "analyses")
    if (!usage.allowed) return NextResponse.json({ error: "career_analysis_limit_reached" }, { status: 403 })
    if (planCheck.workspaceId) {
      await createServiceClient().from("jobs").insert({
        workspace_id: planCheck.workspaceId,
        type: `career_${body.tool}`,
        status: "completed",
        payload: { targetRole: body.targetRole, profile: body.profile, resume: body.resume, jobDescription: body.jobDescription },
        result,
      })
    }
    return NextResponse.json({ result, usage: { remaining: usage.remaining, limit: usage.limit } })
  })(request)
}
