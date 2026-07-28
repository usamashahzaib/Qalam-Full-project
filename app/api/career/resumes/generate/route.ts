export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { resumeDataSchema } from "@/lib/career-resume"
import { isResumeTemplateKey } from "@/lib/resume-templates"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/plan-limits-v2"
import { authorizeRole } from "@/lib/server/roles"
import { consumeCareerUsage, consumeExtraResumeCredit } from "@/lib/server/career-usage"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  templateKey: z.string().trim(),
  targetRole: z.string().trim().min(2).max(160),
  targetCompany: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().min(80).max(12000),
  sourceResume: z.string().trim().min(200).max(20000),
})

const numberScore = (value: unknown) => {
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
    if (!parsed.success || !isResumeTemplateKey(parsed.data?.templateKey || "")) {
      return NextResponse.json({ error: "Add a source resume, target role, job description, and template." }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (planCheck.plan === "Free") {
      const { count } = await supabase.from("resume_documents").select("id", { count: "exact", head: true }).eq("user_id", user.id)
      if ((count || 0) >= 1 && !(await consumeExtraResumeCredit(user.id))) return NextResponse.json({ error: "Free includes one generated resume. Upgrade or add an extra resume credit." }, { status: 429 })
    } else {
      const usage = await consumeCareerUsage(user.id, planCheck.plan, "resume_generation")
      if (!usage.allowed && !(await consumeExtraResumeCredit(user.id))) return NextResponse.json({ error: "Your monthly resume generation limit is reached." }, { status: 429 })
    }

    const input = parsed.data
    const { data: vault } = await supabase.from("career_profiles").select("*").eq("workspace_id", planCheck.workspaceId).maybeSingle()
    const raw = await callAi(
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

    const ai = safeParseJson(raw) as { resume?: unknown; analysis?: Record<string, unknown> } | null
    const resumeParsed = resumeDataSchema.safeParse(ai?.resume)
    if (!resumeParsed.success) return NextResponse.json({ error: "The targeted resume could not be structured safely." }, { status: 503 })
    const analysis = ai?.analysis || {}
    const atsScore = numberScore((analysis.scores as Record<string, unknown> | undefined)?.ats ?? analysis.overall_score)
    analysis.overall_score = numberScore(analysis.overall_score)

    const { data, error } = await supabase
      .from("resume_documents")
      .insert({
        workspace_id: planCheck.workspaceId,
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

    if (error) return NextResponse.json({ error: "The resume could not be saved." }, { status: 500 })
    await supabase.from("resume_versions").insert({ resume_id: data.id, version_number: 1, resume_data: resumeParsed.data, analysis })
    return NextResponse.json({ id: data.id, resumeData: resumeParsed.data, analysis, atsScore }, { status: 201 })
  })(request)
}
