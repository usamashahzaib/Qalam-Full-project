export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { resumeContactSchema, resumeDataSchema } from "@/lib/career-resume"
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

const REDACTION_PLACEHOLDER = /\[(email|phone|national id) removed\]/i

export const MIN_SOURCE_RESUME_CHARS = 200
export const MIN_JOB_DESCRIPTION_CHARS = 80

// The job description is optional on purpose. Plenty of people need a clean,
// ATS-safe resume before they have a specific posting in hand, and requiring a
// JD turned that into a dead end. When one is supplied it has to be long enough
// to target against; when it is absent the route builds a role-targeted resume.
const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Give the resume a name of at least 2 characters.").max(160),
  templateKey: z.string().trim(),
  targetRole: z.string().trim().min(2, "Add the role you are targeting.").max(160),
  targetCompany: z.string().trim().max(160).default(""),
  jobDescription: z
    .string()
    .trim()
    .max(12000)
    .default("")
    .refine(
      (value) => value.length === 0 || value.length >= MIN_JOB_DESCRIPTION_CHARS,
      `Paste at least ${MIN_JOB_DESCRIPTION_CHARS} characters of the job description, or leave it empty to build a role-targeted resume.`
    ),
  sourceResume: z
    .string()
    .trim()
    .min(
      MIN_SOURCE_RESUME_CHARS,
      `Add at least ${MIN_SOURCE_RESUME_CHARS} characters of your existing resume or profile text.`
    )
    .max(20000),
  contact: resumeContactSchema.optional(),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      // One generic message here made every rejection look like an outage.
      // Return the first real field error so the form can be corrected.
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { error: issue?.message || "Check the resume details and try again.", field: issue?.path?.[0] },
        { status: 400 }
      )
    }
    if (!isResumeTemplateKey(parsed.data.templateKey)) {
      return NextResponse.json({ error: "Choose a resume template.", field: "templateKey" }, { status: 400 })
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
    const hasJobDescription = input.jobDescription.length > 0
    const { data: vault } = await supabase.from("career_profiles").select("*").maybeSingle()

    const targetingBrief = hasJobDescription
      ? `Create a targeted ATS resume for this role. Reorder and rewrite only supported facts. Use relevant keywords naturally. Make every bullet action-led and concise.

TARGET ROLE: ${input.targetRole}
TARGET COMPANY: ${input.targetCompany || "Not specified"}
JOB DESCRIPTION:
${input.jobDescription}`
      : `Create an ATS-safe resume aimed at this role. There is no job posting to match against, so target the standard expectations of the role rather than a specific advert. Infer the keywords, skills and section order that a recruiter and an applicant tracking system would expect for this role in this industry, and use only the keywords the source material actually supports. Reorder and rewrite only supported facts. Make every bullet action-led and concise. Keep it single column with plain section headings, no tables, no columns and no graphics.

In analysis.matched_keywords list the role-standard keywords the resume already evidences. In analysis.missing_keywords list the role-standard keywords the source material does not support, so the candidate can add them if they are genuinely true. Score "relevance" against the standard expectations of the role.

TARGET ROLE: ${input.targetRole}
TARGET COMPANY: ${input.targetCompany || "Not specified"}`

    let raw: string
    try {
      raw = await callAi(
        "voice-profile",
        "You are a senior recruiter and ATS resume writer. Return strict JSON only. Preserve facts. Never invent employers, dates, qualifications, job titles, metrics, tools, or achievements.",
        `${targetingBrief}

CAREER VAULT:
${JSON.stringify(vault || {})}

SOURCE RESUME:
${input.sourceResume}

The source text may contain the placeholders [email removed], [phone removed] and [national id removed]. Those are deliberate redactions. Leave fullName, email, phone, location and linkedinUrl as empty strings rather than copying a placeholder or inventing a value.

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
    // Contact details are stripped from the source before it reaches the model,
    // so they arrive from the parser instead and are merged back in here.
    const resumeData = { ...resumeParsed.data }
    const contactKeys = ["fullName", "email", "phone", "location", "linkedinUrl"] as const
    for (const key of contactKeys) {
      if (input.contact?.[key]) resumeData[key] = input.contact[key]
      if (REDACTION_PLACEHOLDER.test(resumeData[key])) resumeData[key] = ""
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
        resume_data: resumeData,
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
    const { error: versionError } = await supabase.from("resume_versions").raw.insert({ resume_id: savedResume.id, version_number: 1, resume_data: resumeData, analysis })
    if (versionError) {
      await supabase.from("resume_documents").delete().eq("id", savedResume.id)
      await releaseReservation()
      return NextResponse.json({ error: "The resume could not be versioned." }, { status: 500 })
    }
    return NextResponse.json({ id: savedResume.id, resumeData, analysis, atsScore }, { status: 201 })
  })(request)
}
