export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { resumeDataSchema } from "@/lib/career-resume"
import { isResumeTemplateKey } from "@/lib/resume-templates"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { normalizeScoreBreakdown, toHundredPointScore } from "@/lib/free-tool-scores"
import {
  claimExtraResumeCredit,
  consumeCareerUsage,
  refundCareerUsage,
  releaseExtraResumeCredit,
} from "@/lib/server/career-usage"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  templateKey: z.string().trim(),
  targetRole: z.string().trim().min(2).max(160),
  targetCompany: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().min(80).max(12000),
  sourceResume: z.string().trim().min(200).max(20000),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !isResumeTemplateKey(parsed.data?.templateKey || "")) {
      return NextResponse.json({ error: "Add a source resume, target role, job description, and template." }, { status: 400 })
    }

    const supabase = createScopedClient(planCheck.workspaceId)
    let usageConsumed = false
    let creditOrderId: string | null = null
    const usage = await consumeCareerUsage(user.id, planCheck.plan, "resume_generation")
    usageConsumed = usage.allowed
    if (!usage.allowed) {
      creditOrderId = await claimExtraResumeCredit(user.id)
      if (!creditOrderId) return NextResponse.json({ error: "Your monthly resume generation limit is reached. Upgrade or add an extra resume credit." }, { status: 429 })
    }
    const releaseReservation = async () => {
      if (usageConsumed) await refundCareerUsage(user.id, "resume_generation")
      if (creditOrderId) await releaseExtraResumeCredit(user.id, creditOrderId)
    }

    const input = parsed.data
    const { data: vault } = await supabase.from("career_profiles").select("*").maybeSingle()
    let raw: string
    try {
      raw = await callAi(
        "voice-profile",
        "You are a senior recruiter and ATS resume writer. Return strict JSON only. Preserve facts. Never invent employers, dates, qualifications, job titles, metrics, tools, or achievements.",
        `Create a targeted ATS resume for this role. Reorder and rewrite only supported facts. Use relevant keywords naturally. Make every bullet action-led and concise.

TARGET ROLE: ${input.targetRole}
TARGET COMPANY: ${input.targetCompany || "Not specified"}
JOB DESCRIPTION:
${input.jobDescription}

CAREER VAULT:
${JSON.stringify(vault || {})}

SOURCE RESUME:
${input.sourceResume}

Every score must be an integer from 0 to 100.

Return:
{
  "resume": {
    "fullName": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedinUrl": "",
    "headline": "",
    "summary": "",
    "skills": [""],
    "experience": [{"title":"","organization":"","location":"","startDate":"","endDate":"","bullets":[""]}],
    "education": [{"title":"","organization":"","location":"","startDate":"","endDate":"","bullets":[]}],
    "certifications": [""],
    "projects": []
  },
  "analysis": {
    "overall_score": 0,
    "scores": {"ats":0,"relevance":0,"impact":0,"clarity":0,"career_progression":0},
    "matched_keywords": [""],
    "missing_keywords": [""],
    "warnings": [""],
    "changes": [""]
  }
}`,
        { json: true, temperature: 0.2, timeout: 35000, userId: user.id, plan: planCheck.plan }
      )
    } catch (error) {
      await releaseReservation()
      throw error
    }

    const ai = safeParseJson(raw) as { resume?: unknown; analysis?: Record<string, unknown> } | null
    const resumeParsed = resumeDataSchema.safeParse(ai?.resume)
    if (!resumeParsed.success) {
      await releaseReservation()
      return NextResponse.json({ error: "The targeted resume could not be structured safely." }, { status: 503 })
    }
    const analysis = ai?.analysis || {}
    analysis.scores = normalizeScoreBreakdown(analysis.scores)
    const atsScore = toHundredPointScore((analysis.scores as Record<string, unknown>).ats ?? analysis.overall_score)
    analysis.overall_score = toHundredPointScore(analysis.overall_score)

    const { data, error } = await supabase
      .from("resume_documents")
      .insert({
        user_id: user.id,
        title: input.title,
        template_key: input.templateKey,
        target_role: input.targetRole,
        target_company: input.targetCompany,
        job_description: input.jobDescription,
        resume_data: resumeParsed.data,
        analysis,
        ats_score: atsScore,
        status: "ready",
      })
      .select("*")
      .single()

    if (error) {
      await releaseReservation()
      return NextResponse.json({ error: "The resume could not be saved." }, { status: 500 })
    }
    const savedResume = data as unknown as { id: string }
    // resume_versions has no workspace_id column of its own (scoped
    // indirectly via resume_id, just created above) - use .raw.
    const { error: versionError } = await supabase.from("resume_versions").raw.insert({ resume_id: savedResume.id, version_number: 1, resume_data: resumeParsed.data, analysis })
    if (versionError) {
      await supabase.from("resume_documents").delete().eq("id", savedResume.id)
      await releaseReservation()
      return NextResponse.json({ error: "The resume could not be versioned." }, { status: 500 })
    }
    return NextResponse.json({ id: savedResume.id, resumeData: resumeParsed.data, analysis, atsScore }, { status: 201 })
  })(request)
}
