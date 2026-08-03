export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { claimCoverLetterCredit, releaseCoverLetterCredit } from "@/lib/server/career-usage"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  targetRole: z.string().trim().min(2).max(160),
  targetCompany: z.string().trim().max(160).default(""),
  hiringManager: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().min(80).max(12000),
  sourceResume: z.string().trim().max(20000).default(""),
})

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json({ error: "Add a target role and the job description." }, { status: 400 })
    }

    const creditOrderId = await claimCoverLetterCredit(user.id)
    if (!creditOrderId) {
      return NextResponse.json(
        { error: "No cover letter credit available. Buy the cover letter add-on first.", addonKey: "cover_letter" },
        { status: 402 }
      )
    }

    const input = parsed.data
    const supabase = createServiceClient()
    const { data: vault } = await supabase.from("career_profiles").select("*").eq("workspace_id", planCheck.workspaceId).maybeSingle()

    let content: string
    try {
      content = await callAi(
        "voice-profile",
        "You are a senior career coach writing a concise, specific cover letter. Preserve facts. Never invent employers, dates, qualifications, or achievements. Return plain text only, no markdown, no headers, no placeholders in brackets left unfilled.",
        `Write a cover letter matched exactly to this job description. 3 to 4 short paragraphs. Open with genuine interest tied to the role, connect real experience to the JD's requirements, close with a direct call to action. No cliches, no generic filler.

TARGET ROLE: ${input.targetRole}
TARGET COMPANY: ${input.targetCompany || "Not specified"}
HIRING MANAGER: ${input.hiringManager || "Not specified, use a neutral greeting"}
JOB DESCRIPTION:
${input.jobDescription}

CAREER VAULT:
${JSON.stringify(vault || {})}

CANDIDATE BACKGROUND:
${input.sourceResume || "Use only the career vault above."}`,
        { json: false, temperature: 0.4, timeout: 35000, userId: user.id, plan: planCheck.plan }
      )
    } catch (error) {
      await releaseCoverLetterCredit(user.id, creditOrderId)
      throw error
    }

    const trimmed = content.trim()
    if (trimmed.length < 40) {
      await releaseCoverLetterCredit(user.id, creditOrderId)
      return NextResponse.json({ error: "The cover letter could not be generated safely." }, { status: 503 })
    }

    const { data, error } = await supabase
      .from("cover_letter_documents")
      .insert({
        workspace_id: planCheck.workspaceId,
        user_id: user.id,
        order_id: creditOrderId,
        title: input.title,
        target_role: input.targetRole,
        target_company: input.targetCompany,
        hiring_manager: input.hiringManager,
        job_description: input.jobDescription,
        content: trimmed,
        status: "ready",
      })
      .select("*")
      .single()

    if (error) {
      await releaseCoverLetterCredit(user.id, creditOrderId)
      return NextResponse.json({ error: "The cover letter could not be saved." }, { status: 500 })
    }
    return NextResponse.json({ id: data.id, content: trimmed }, { status: 201 })
  })(request)
}
