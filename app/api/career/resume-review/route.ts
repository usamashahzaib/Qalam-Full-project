export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { consumeCareerUsage, refundCareerUsage } from "@/lib/server/career-usage"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  resumeText: z.string().trim().min(200).max(20000),
  jobDescription: z.string().trim().max(12000).default(""),
})

const score = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "Paste at least 200 characters from your resume." }, { status: 400 })

    const usage = await consumeCareerUsage(user.id, planCheck.plan, "resume_review")
    if (!usage.allowed) return NextResponse.json({ error: "Your resume review limit is reached for this month." }, { status: 429 })

    const input = parsed.data
    let raw: string
    try {
      raw = await callAi(
        "voice-profile",
        "You are a senior recruiter and ATS resume specialist. Return strict JSON only. Preserve truth. Never invent experience, metrics, employers, or qualifications.",
        `Review this resume for ATS compatibility, career progression, clarity, and role relevance.

RESUME:
${input.resumeText}

JOB DESCRIPTION:
${input.jobDescription || "No job description supplied. Review for general market readiness."}

Return:
{
  "overall_score": 0,
  "scores": {
    "ats": 0,
    "impact": 0,
    "relevance": 0,
    "clarity": 0,
    "career_progression": 0
  },
  "verdict": "short recruiter verdict",
  "risks": ["specific rejection risks"],
  "missing_keywords": ["keywords supported by the candidate context"],
  "priority_fixes": ["five prioritized fixes"],
  "rewritten_summary": "truthful rewritten professional summary",
  "next_step": "single highest value action"
}`,
        { json: true, temperature: 0.25, timeout: 30000, userId: user.id, plan: planCheck.plan }
      )
    } catch (error) {
      await refundCareerUsage(user.id, "resume_review")
      throw error
    }

    const parsedAi = safeParseJson(raw)
    if (!parsedAi || typeof parsedAi !== "object") {
      await refundCareerUsage(user.id, "resume_review")
      return NextResponse.json({ error: "The resume review could not be completed." }, { status: 503 })
    }
    const result = parsedAi as Record<string, unknown>
    result.overall_score = score(result.overall_score)
    if (result.scores && typeof result.scores === "object") {
      result.scores = Object.fromEntries(Object.entries(result.scores).map(([key, value]) => [key, score(value)]))
    }

    const { error } = await createServiceClient().from("resume_reviews").insert({
      workspace_id: planCheck.workspaceId,
      user_id: user.id,
      resume_text: "",
      job_description: "",
      result,
      overall_score: result.overall_score,
    })
    if (error) console.error("resume_review_save_failed", error)

    return NextResponse.json(result)
  })(request)
}
