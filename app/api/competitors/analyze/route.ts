import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"

const MONTHLY_LIMIT = 5

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

type AnalysisResult = {
  hookStructure: { pattern: string; length: string; type: string }
  engagementFactors: string[]
  contentPattern: { framework: string; structure: string; estimatedReadTime: string }
  improvements: string[]
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!isProOrAbove(user.plan)) {
      return NextResponse.json({ error: "Competitor research requires Pro plan." }, { status: 403 })
    }

    const supabase = createServiceClient()

    const { data: usage } = await supabase
      .from("plan_usage")
      .select("competitor_runs_used")
      .eq("user_id", user.id)
      .maybeSingle()

    const runsUsed = (usage as { competitor_runs_used?: number } | null)?.competitor_runs_used ?? 0

    if (runsUsed >= MONTHLY_LIMIT) {
      return NextResponse.json(
        { error: "Monthly research limit reached. Resets next billing cycle.", runsUsed, limit: MONTHLY_LIMIT },
        { status: 429 }
      )
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const postText = String(body.postText || "").trim()
    const postUrl = String(body.postUrl || "").trim()

    if (postText.length < 50) {
      return NextResponse.json({ error: "Paste at least 50 characters of the competitor post" }, { status: 400 })
    }

    const system = `You are an expert LinkedIn content strategist. Analyze posts with surgical precision. Return only valid JSON. No markdown, no extra text.`

    const userMsg = `Analyze this LinkedIn post and return a structured breakdown.

POST TEXT:
${postText.slice(0, 3000)}

Return JSON with exactly this structure:
{
  "hookStructure": {
    "pattern": "e.g. Bold claim, Question, Story opener, Data-led, Contrarian",
    "length": "short | medium | long",
    "type": "e.g. Contrarian, Curiosity, Authority, Personal, Data"
  },
  "engagementFactors": [
    "specific factor 1 (e.g. personal vulnerability with concrete numbers)",
    "specific factor 2",
    "specific factor 3",
    "specific factor 4"
  ],
  "contentPattern": {
    "framework": "e.g. Problem-Agitate-Solve, Listicle, Narrative, Data-Story, Before-After-Bridge",
    "structure": "e.g. Hook → Context → 3 key insights → CTA",
    "estimatedReadTime": "e.g. 45 seconds"
  },
  "improvements": [
    "specific actionable tip 1",
    "specific actionable tip 2",
    "specific actionable tip 3"
  ]
}`

    const raw = await callAi(system, userMsg, {
      json: true, temperature: 0.3, maxTokens: 900,
      userId: user.id, plan: user.plan, cache: false,
    })

    const analysis = safeParseJson<AnalysisResult>(raw)
    if (!analysis) {
      return NextResponse.json({ error: "Analysis failed - try again" }, { status: 502 })
    }

    await supabase.from("competitor_analyses").insert({
      user_id: user.id,
      post_text: postText.slice(0, 2000),
      post_url: postUrl || null,
      hook_structure: analysis.hookStructure,
      engagement_factors: analysis.engagementFactors,
      content_pattern: analysis.contentPattern,
      improvements: analysis.improvements,
    })

    await supabase
      .from("plan_usage")
      .update({ competitor_runs_used: runsUsed + 1 })
      .eq("user_id", user.id)

    return NextResponse.json({ analysis, runsUsed: runsUsed + 1, limit: MONTHLY_LIMIT })
  })(request)
}
