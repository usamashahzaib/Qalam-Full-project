export const maxDuration = 30

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { authorizeRole } from "@/lib/server/roles"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { buildInterviewPrompt } from "@/lib/prompts/role-aware-system"
import { MAX_INTERVIEW_QUESTIONS } from "@/lib/interview"
import { log } from "@/lib/server/logging"

const BodySchema = z.object({
  topic: z.string().trim().min(3, "Topic must be at least 3 characters").max(1000),
  role: z.string().optional().default(""),
  goal: z.string().max(500).optional().default(""),
})

// Questions the writer asks before it writes. Asking costs no draft credit: the
// answers are what make the draft worth spending one on.
export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response
    const roleError = await authorizeRole(req, planCheck.workspaceId, "editor")
    if (roleError) return roleError

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

    const { system, user: userMsg } = buildInterviewPrompt(parsed.data.topic, parsed.data.role, parsed.data.goal)
    try {
      const raw = await callAi("interview", system, userMsg, {
        json: true, temperature: 0.6, maxTokens: 400,
        userId: user.id, plan: planCheck.plan,
        // Questions to the author, not prose that goes out under their name.
        humanWriting: false,
      })
      const data = safeParseJson<{ questions?: unknown }>(raw)
      const questions = (Array.isArray(data?.questions) ? data.questions : [])
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => q.trim().slice(0, 200))
        .slice(0, MAX_INTERVIEW_QUESTIONS)
      if (!questions.length) throw new Error("no questions returned")
      return NextResponse.json({ questions })
    } catch (error) {
      log.warn("generate.interview.failed", { userId: user.id, error: (error as Error).message })
      return NextResponse.json({ error: "Could not prepare questions right now." }, { status: 503 })
    }
  })(request)
}
