import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { log } from "@/lib/server/logging"

const MIN_LENGTH = 10
const MAX_LENGTH = 5000

type FilterResult = { attracts: string[]; repels: string[] }

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Free")
    if (!planCheck.ok) return planCheck.response

    if (!planCheck.isActive) {
      return NextResponse.json(
        { error: "plan_expired", message: "Your plan has expired. Please renew to continue." },
        { status: 403 }
      )
    }

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const draft = String(body.draft || "").trim()
    if (draft.length < MIN_LENGTH) {
      return NextResponse.json({ error: `draft must be at least ${MIN_LENGTH} characters` }, { status: 400 })
    }
    if (draft.length > MAX_LENGTH) {
      return NextResponse.json({ error: `draft must be ${MAX_LENGTH} characters or fewer` }, { status: 400 })
    }

    const system = `You are a LinkedIn audience analyst. Given a draft post, predict who it will attract and who it will repel before it is published.
Return JSON only, no other text:
{ "attracts": ["audience type 1", "audience type 2", "audience type 3"], "repels": ["audience type 1", "audience type 2"] }
Each entry should be a short, specific audience description (role, mindset, or stance), not a generic label like "people who like this topic".`

    const userMsg = `Draft post:\n${draft}`

    let result: FilterResult | null = null
    try {
      const raw = await callAi("engagement-prediction", system, userMsg, {
        json: true,
        temperature: 0.6,
        maxTokens: 400,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
      const parsed = safeParseJson<FilterResult>(raw)
      if (parsed && Array.isArray(parsed.attracts) && Array.isArray(parsed.repels)) {
        result = parsed
      }
    } catch (err) {
      log.warn("silent_growth.filter_draft.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!result) {
      return NextResponse.json(
        { error: "ai_unavailable", message: "Analysis is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    log.info("silent_growth.filter_draft.done", { userId: user.id })

    return NextResponse.json({
      attracts: result.attracts.slice(0, 5),
      repels: result.repels.slice(0, 5),
    })
  })(request)
}
