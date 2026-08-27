export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { consumeCareerUsage, refundCareerUsage } from "@/lib/server/career-usage"
import { buildResumeReviewPrompt, normalizeResumeReview } from "@/lib/career-resume-review"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  resumeText: z.string().trim().min(200).max(20000),
  jobDescription: z.string().trim().max(12000).default(""),
})

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
        "Return strict JSON only. Preserve candidate truth and evaluate only job-relevant evidence.",
        buildResumeReviewPrompt(input.resumeText, input.jobDescription),
        { json: true, temperature: 0.25, timeout: 30000, userId: user.id, plan: planCheck.plan }
      )
    } catch (error) {
      await refundCareerUsage(user.id, "resume_review")
      throw error
    }

    const result = normalizeResumeReview(safeParseJson(raw))
    if (!result) {
      await refundCareerUsage(user.id, "resume_review")
      return NextResponse.json({ error: "The resume review could not be completed." }, { status: 503 })
    }
    const responseResult = {
      ...result,
      risks: result.risks.map((risk) => `${risk.issue}: ${risk.why}`),
      missing_keywords: result.missing_keywords.map((item) => `${item.keyword} (${item.evidence_status})`),
      priority_fixes: result.priority_fixes.map((fix) => `${fix.section}: ${fix.action} Example: ${fix.example}`),
    }
    const { error } = await createScopedClient(planCheck.workspaceId).from("resume_reviews").insert({
      user_id: user.id,
      resume_text: "",
      job_description: "",
      result: responseResult,
      overall_score: responseResult.overall_score,
    })
    if (error) console.error("resume_review_save_failed", error)

    return NextResponse.json(responseResult)
  })(request)
}
