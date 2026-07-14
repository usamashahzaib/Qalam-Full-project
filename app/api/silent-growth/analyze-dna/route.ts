import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { log } from "@/lib/server/logging"

const MIN_POSTS = 5
const MAX_POSTS = 10
const MAX_POST_LENGTH = 3000

type DnaResult = {
  dna: { hookPatterns: string[]; lengthProfile: string; tone: string; engagementTriggers: string[] }
  comments: string[]
  template: string
}

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

    const rawPosts = Array.isArray(body.posts) ? body.posts : []
    const posts = rawPosts
      .map((p) => String(p || "").trim())
      .filter((p) => p.length >= 10)
      .slice(0, MAX_POSTS)
      .map((p) => p.slice(0, MAX_POST_LENGTH))

    if (posts.length < MIN_POSTS) {
      return NextResponse.json(
        { error: `Provide at least ${MIN_POSTS} post texts (10+ characters each)` },
        { status: 400 }
      )
    }

    const system = `You are a LinkedIn engagement analyst. You are given several posts written by ONE target profile.
Analyze them and return a "DNA profile" describing how this person writes, plus material to help someone engage with them thoughtfully.
Return JSON only, no other text:
{
  "dna": {
    "hookPatterns": ["string", "string"],
    "lengthProfile": "string describing typical post length/structure",
    "tone": "string describing voice and tone",
    "engagementTriggers": ["string", "string"]
  },
  "comments": ["comment 1", "comment 2", "comment 3"],
  "template": "a post template (1-2 paragraphs, use [bracket] placeholders) modeled on this person's style"
}
The 3 comments must be genuine, specific, non-generic reactions a thoughtful peer could leave on this person's future posts. No hashtags, no emoji, no flattery-only comments.`

    const userMsg = `Target profile's recent posts:\n\n${posts.map((p, i) => `--- Post ${i + 1} ---\n${p}`).join("\n\n")}`

    let result: DnaResult | null = null
    try {
      const raw = await callAi("engagement-prediction", system, userMsg, {
        json: true,
        temperature: 0.7,
        maxTokens: 900,
        userId: user.id,
        plan: planCheck.plan,
        cache: false,
      })
      const parsed = safeParseJson<DnaResult>(raw)
      if (
        parsed &&
        parsed.dna &&
        Array.isArray(parsed.comments) &&
        parsed.comments.length > 0 &&
        typeof parsed.template === "string"
      ) {
        result = parsed
      }
    } catch (err) {
      log.warn("silent_growth.analyze_dna.ai_failed", { userId: user.id, error: (err as Error).message })
    }

    if (!result) {
      return NextResponse.json(
        { error: "ai_unavailable", message: "Analysis is temporarily unavailable. Please try again in a moment." },
        { status: 503 }
      )
    }

    log.info("silent_growth.analyze_dna.done", { userId: user.id, postCount: posts.length })

    return NextResponse.json({
      dna: result.dna,
      comments: result.comments.slice(0, 3),
      template: result.template,
    })
  })(request)
}
