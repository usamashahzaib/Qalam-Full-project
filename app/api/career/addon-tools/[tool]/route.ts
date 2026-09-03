export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createScopedClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { claimCareerAddonCredit, releaseCareerAddonCredit } from "@/lib/server/career-usage"
import { getCareerAddonTool, type SoftwareAddonKey } from "@/lib/career-addon-tools"
import { toHundredPointScore } from "@/lib/free-tool-scores"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  targetRole: z.string().trim().min(2).max(160),
  targetCompany: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().max(12000).default(""),
  sourceResume: z.string().trim().max(20000).default(""),
  profileText: z.string().trim().max(16000).default(""),
  goals: z.string().trim().max(6000).default(""),
})

const prompts: Record<SoftwareAddonKey, { system: string; task: string }> = {
  interview_pack: {
    system: "You are a senior interview coach and hiring panelist. Preserve truth. Never invent candidate experience. Return strict JSON only.",
    task: `Create a complete interview practice pack. Include likely screening, behavioral, role-specific, leadership, and closing questions. Tie every answer framework to supplied evidence. Include red flags, questions to ask the employer, and a scorecard. The score must be an integer from 0 to 100.

Return {"summary":"","score":0,"sections":[{"title":"Likely questions","items":[""]},{"title":"STAR evidence bank","items":[""]},{"title":"Answer guidance","items":[""]},{"title":"Risks to address","items":[""]},{"title":"Questions to ask","items":[""]},{"title":"Practice scorecard","items":[""]}]}`,
  },
  recruiter_review: {
    system: "You are a senior recruiter and ATS resume specialist. Preserve truth. Never invent roles, dates, qualifications, metrics, or achievements. Return strict JSON only.",
    task: `Perform a paid deep resume review, materially more detailed than a basic ATS scan. Evaluate the six-second recruiter read, ATS structure, role relevance, progression, evidence, language, and rejection risks. Provide exact section and bullet rewrites using only supported facts. The score must be an integer from 0 to 100.

Return {"summary":"clear recruiter verdict","score":0,"sections":[{"title":"Six-second recruiter read","items":[""]},{"title":"ATS and keyword gaps","items":[""]},{"title":"Rejection risks","items":[""]},{"title":"Exact rewrites","items":[""]},{"title":"Priority correction plan","items":[""]}]}`,
  },
  linkedin_rewrite: {
    system: "You are a senior LinkedIn positioning strategist. Preserve truth. Never invent credentials, employers, outcomes, or metrics. Return strict JSON only.",
    task: `Rewrite the complete LinkedIn profile around one credible market position. Align the headline, About section, experience, skills, target audience, and future content themes to the same professional identity. Include multiple headline options, a ready-to-use About section, experience bullet rewrites, a skills and keyword map, Featured section recommendations, three evidence-supported content pillars, and a final quality checklist. Do not promise reach or use engagement-bait tactics. The score must be an integer from 0 to 100.

Return {"summary":"market position","score":0,"sections":[{"title":"Headline options","items":[""]},{"title":"About section","items":[""]},{"title":"Experience rewrites","items":[""]},{"title":"Skills and keyword map","items":[""]},{"title":"Featured section plan","items":[""]},{"title":"Content pillars","items":[""]},{"title":"Final checklist","items":[""]}]}`,
  },
  career_blueprint: {
    system: "You are a pragmatic career strategist. Preserve truth. Do not promise interviews, promotions, or job offers. Return strict JSON only.",
    task: `Create a software-delivered 90-day career strategy. Diagnose positioning, identify evidence and skill gaps, define target employers, build networking and application systems, recommend credible content themes, and provide weekly milestones with measurable actions. The score must be an integer from 0 to 100.

Return {"summary":"strategy thesis","score":0,"sections":[{"title":"Positioning diagnosis","items":[""]},{"title":"Evidence and skill gaps","items":[""]},{"title":"Target employer strategy","items":[""]},{"title":"Networking system","items":[""]},{"title":"Application system","items":[""]},{"title":"Content and visibility","items":[""]},{"title":"90-day milestones","items":[""]}]}`,
  },
}

const validInput = (key: SoftwareAddonKey, input: z.infer<typeof schema>) => {
  if (key === "interview_pack" || key === "recruiter_review") return input.jobDescription.length >= 80 && input.sourceResume.length >= 200
  if (key === "linkedin_rewrite") return input.profileText.length >= 120 && input.goals.length >= 20
  return input.sourceResume.length >= 200 && input.goals.length >= 20
}

const normalizeResult = (value: unknown) => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const sections = Array.isArray(raw.sections) ? raw.sections.flatMap((section) => {
    if (!section || typeof section !== "object") return []
    const row = section as Record<string, unknown>
    const title = String(row.title || "").trim()
    const items = Array.isArray(row.items) ? row.items.map(String).map((item) => item.trim()).filter(Boolean).slice(0, 20) : []
    return title && items.length ? [{ title, items }] : []
  }).slice(0, 10) : []
  const score = toHundredPointScore(raw.score)
  return { summary: String(raw.summary || "").trim(), score, sections }
}

export async function GET(request: NextRequest, context: { params: Promise<{ tool: string }> }) {
  return withAuth(async (req) => {
    const config = getCareerAddonTool((await context.params).tool)
    if (!config) return NextResponse.json({ error: "Career tool not found." }, { status: 404 })
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const { data, error } = await createScopedClient(planCheck.workspaceId)
      .from("career_addon_artifacts")
      .select("id, title, result, created_at, updated_at")
      .eq("addon_key", config.addonKey)
      .eq("status", "ready")
      .order("updated_at", { ascending: false })
      .limit(30)
    if (error) return NextResponse.json({ error: "Saved results could not be loaded." }, { status: 500 })
    return NextResponse.json({ artifacts: data || [] })
  })(request)
}

export async function POST(request: NextRequest, context: { params: Promise<{ tool: string }> }) {
  return withAuth(async (req, user) => {
    const config = getCareerAddonTool((await context.params).tool)
    if (!config) return NextResponse.json({ error: "Career tool not found." }, { status: 404 })
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success || !validInput(config.addonKey, parsed.data)) {
      return NextResponse.json({ error: "Complete every required field with enough detail." }, { status: 400 })
    }

    const orderId = await claimCareerAddonCredit(user.id, config.addonKey)
    if (!orderId) return NextResponse.json({ error: `No ${config.title.toLowerCase()} credit is available.` }, { status: 402 })

    const input = parsed.data
    const prompt = prompts[config.addonKey]
    const supabase = createScopedClient(planCheck.workspaceId)
    const { data: vault } = await supabase.from("career_profiles").select("*").maybeSingle()

    let result: ReturnType<typeof normalizeResult>
    try {
      const raw = await callAi(
        "voice-profile",
        prompt.system,
        `${prompt.task}\n\nTARGET ROLE: ${input.targetRole}\nTARGET COMPANY: ${input.targetCompany || "Not specified"}\nJOB DESCRIPTION: ${input.jobDescription || "Not supplied"}\nCAREER VAULT: ${JSON.stringify(vault || {})}\nCAREER EVIDENCE: ${input.sourceResume || input.profileText}\nGOALS: ${input.goals || "Not supplied"}`,
        { json: true, temperature: 0.25, timeout: 40000, userId: user.id, plan: planCheck.plan }
      )
      result = normalizeResult(safeParseJson(raw))
      if (!result.summary || !result.sections.length) throw new Error("career_addon_result_invalid")
    } catch (error) {
      await releaseCareerAddonCredit(user.id, orderId, config.addonKey)
      throw error
    }

    const { data, error } = await supabase.from("career_addon_artifacts").insert({
      user_id: user.id,
      order_id: orderId,
      addon_key: config.addonKey,
      title: input.title,
      input,
      result,
      status: "ready",
    }).select("id, title, result, created_at, updated_at").single()
    if (error) {
      await releaseCareerAddonCredit(user.id, orderId, config.addonKey)
      return NextResponse.json({ error: "The generated result could not be saved." }, { status: 500 })
    }
    return NextResponse.json({ artifact: data }, { status: 201 })
  })(request)
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ tool: string }> }) {
  return withAuth(async (req) => {
    const config = getCareerAddonTool((await context.params).tool)
    if (!config) return NextResponse.json({ error: "Career tool not found." }, { status: 404 })
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Saved result id is required." }, { status: 400 })
    const { error } = await createScopedClient(planCheck.workspaceId)
      .from("career_addon_artifacts")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("addon_key", config.addonKey)
    if (error) return NextResponse.json({ error: "Saved result could not be deleted." }, { status: 500 })
    return NextResponse.json({ success: true })
  })(request)
}
