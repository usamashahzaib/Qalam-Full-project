import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { callAi, safeParseJson } from "@/lib/server/ai-router-v2"

const isProOrAbove = (plan: string) => {
  const p = plan.toLowerCase()
  return p === "pro" || p === "agency" || p.startsWith("agency")
}

type Characteristics = {
  tone: string
  sentenceLength: string
  vocabulary: string
  commonPhrases: string[]
  transitions: string[]
  ctaStyle: string
}

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    if (!isProOrAbove(user.plan)) {
      return NextResponse.json({ error: "Voice training requires Pro plan." }, { status: 403 })
    }

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const examplePosts = String(body.examplePosts || "").trim()
    if (examplePosts.length < 100) {
      return NextResponse.json({ error: "Paste at least 3-5 example posts (100+ characters)" }, { status: 400 })
    }

    const system = `You are a voice analysis expert for LinkedIn content. Return only valid JSON. No markdown.`

    const userMsg = `Analyze the writing voice from these LinkedIn post examples and extract characteristics.

POSTS:
${examplePosts.slice(0, 3000)}

Return JSON:
{
  "tone": "one adjective (e.g. Direct, Empathetic, Technical, Bold)",
  "sentenceLength": "short | medium | long",
  "vocabulary": "simple | moderate | advanced",
  "commonPhrases": ["phrase 1", "phrase 2", "phrase 3", "phrase 4", "phrase 5"],
  "transitions": ["transition 1", "transition 2", "transition 3"],
  "ctaStyle": "question | direct | soft"
}`

    let raw: string
    try {
      raw = await callAi(system, userMsg, {
        json: true, temperature: 0.3, maxTokens: 600,
        userId: user.id, plan: user.plan, cache: false,
      })
    } catch {
      return NextResponse.json({ error: "Voice analysis failed. Please try again." }, { status: 503 })
    }

    const characteristics = safeParseJson<Characteristics>(raw)
    if (!characteristics) {
      return NextResponse.json({ error: "Voice analysis returned an unexpected response. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ characteristics })
  })(request)
}
