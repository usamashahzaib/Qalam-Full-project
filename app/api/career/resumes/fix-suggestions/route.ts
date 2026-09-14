export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { resumeDataSchema } from "@/lib/career-resume"
import { scoreResume } from "@/lib/ats-engine"
import { normalizeResumeData } from "@/lib/ats-normalize"
import { FIX_FORMULAS, REWRITE_CHECKS, findFixTargets } from "@/lib/ats-fixes"

const schema = z.object({
  workspaceKey: z.string().uuid().optional(),
  checkId: z.string().trim().min(2).max(60),
  targetRole: z.string().trim().max(160).default(""),
  jobDescription: z.string().trim().max(12000).default(""),
  resumeData: resumeDataSchema,
  /** Ask for fresh wording instead of the cached answer. */
  regenerate: z.boolean().default(false),
})

const DASHES = /[–—]/g

// Rewrites for the exact lines a check is failing on. The targets are
// recomputed here from the submitted resume rather than trusted from the
// client, so the model only ever sees lines the audit actually flagged.
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) return NextResponse.json({ error: "The resume could not be read for suggestions." }, { status: 400 })
    const input = parsed.data
    if (!REWRITE_CHECKS.has(input.checkId)) return NextResponse.json({ suggestions: [] })

    const resume = normalizeResumeData(input.resumeData)
    const audit = scoreResume({ resume, targetRole: input.targetRole, jobDescription: input.jobDescription })
    const targets = findFixTargets(input.checkId, resume, audit)
    if (targets.length === 0) return NextResponse.json({ suggestions: [] })

    const formula = FIX_FORMULAS[input.checkId]
    const missing = audit.keywords.missing.map((item) => item.keyword).slice(0, 12)
    const check = audit.factors.flatMap((factor) => factor.checks).find((item) => item.id === input.checkId)

    const prompt = `Rewrite each resume line below so it passes this ATS check. Give three different options per line.

CHECK: ${check?.label || input.checkId}
WHAT IS WRONG: ${check?.detail || ""}
SENTENCE SHAPE: ${formula?.formula || "Action verb, scope, result"}
EXAMPLE OF THE SHAPE (do not copy its facts): ${formula?.example || ""}
TARGET ROLE: ${input.targetRole || "Not specified"}
${missing.length ? `POSTING TERMS NOT YET EVIDENCED, use one only where the line's work plausibly covers it: ${missing.join(", ")}` : ""}

RULES
- Keep every fact in the original line. Never invent a number, amount, percentage, tool, employer or achievement.
- When the shape needs a figure the line does not give, write a short fill-in prompt in square brackets, for example "[number of vendors]" or "[% cost saved]". The candidate will fill it in.
- Bullets open with a past tense action verb, stay under 30 words, carry no pronouns, no filler phrases and no trailing full stop.
- A summary is 40 to 80 words. A headline is 3 to 12 words that start with the target role.
- Use a plain hyphen, never an em dash or en dash.

CANDIDATE CONTEXT
Headline: ${resume.headline}
Skills: ${resume.skills.join(", ")}
Roles: ${resume.experience.map((entry) => `${entry.title} at ${entry.organization}`).join("; ")}

LINES
${targets.map((target) => `id=${target.id} | ${target.context} | problem: ${target.problem}\n${target.current || "(empty)"}`).join("\n\n")}

Return JSON only: {"suggestions":[{"id":"<line id>","options":["","",""]}]}`

    let raw: string
    try {
      raw = await callAi(
        "post-improvement",
        "You are a senior resume writer. Return strict JSON only. Preserve the candidate's facts and use square-bracket prompts for any figure you do not have.",
        prompt,
        { json: true, temperature: input.regenerate ? 0.8 : 0.4, timeout: 30000, maxTokens: 3000, userId: user.id, plan: planCheck.plan, cache: !input.regenerate },
      )
    } catch {
      return NextResponse.json({ error: "Suggestions are unavailable right now. Try again in a moment." }, { status: 503 })
    }

    const ai = safeParseJson(raw) as { suggestions?: { id?: unknown; options?: unknown }[] } | null
    const byId = new Map(targets.map((target) => [target.id, target]))
    const suggestions = (ai?.suggestions || [])
      .filter((item) => typeof item.id === "string" && byId.has(item.id) && Array.isArray(item.options))
      .map((item) => ({
        id: item.id as string,
        options: (item.options as unknown[])
          .filter((option): option is string => typeof option === "string")
          .map((option) => option.replace(DASHES, "-").replace(/^\s*[-*•]\s*/, "").trim())
          .filter((option) => option.length > 3 && option.length <= 900)
          .slice(0, 3),
      }))
      .filter((item) => item.options.length > 0)

    return NextResponse.json({ suggestions })
  })(request)
}
