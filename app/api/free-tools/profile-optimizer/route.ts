import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"

export async function POST(req: NextRequest) {
  try {
    const { about, headline = "", audience = "" } = await req.json()
    if (!String(about || "").trim()) return NextResponse.json({ error: "About section is required" }, { status: 400 })

    const result = await callAi(
      "Return strict JSON only.",
      `Rewrite and optimize this LinkedIn About section. Preserve truth. Improve positioning, clarity, credibility, and conversion.

HEADLINE:
${headline}

TARGET AUDIENCE:
${audience}

ABOUT SECTION:
${about}

OUTPUT JSON:
{
  "profile_score": number,
  "positioning_diagnosis": "specific diagnosis",
  "optimized_about": "rewritten LinkedIn About section",
  "headline_suggestion": "stronger headline",
  "top_fixes": ["specific fix"],
  "keyword_suggestions": ["keyword"]
}`,
      { json: true, temperature: 0.4, timeout: 12000 }
    )

    return NextResponse.json(JSON.parse(result))
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message || "Profile optimization failed" }, { status: 503 })
  }
}
