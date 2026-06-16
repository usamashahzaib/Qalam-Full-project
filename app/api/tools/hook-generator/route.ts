import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { callAi } from "@/lib/server/ai-router-v2"

const schema = z.object({
  topic: z.string().min(3).max(300),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

    const systemPrompt = `You are an elite LinkedIn content strategist specializing in high-performing hooks.
Generate exactly 5 powerful LinkedIn post opening lines (hooks) for the given topic.
Rules:
- Each hook must be a single sentence or short 2-line opener (no more than 20 words)
- Use proven hook structures: contrarian, numbered list, personal revelation, curiosity gap, bold claim
- No em dashes. Use plain hyphens if needed.
- No generic phrases like "In today's world" or "Have you ever"
- Be specific, sharp, and instantly attention-grabbing
- Each hook must be distinctly different in structure and angle
Return ONLY a JSON array of 5 strings. No explanation, no markdown, just the JSON array.
Example format: ["Hook 1 here", "Hook 2 here", "Hook 3 here", "Hook 4 here", "Hook 5 here"]`

    const raw = await callAi(
      systemPrompt,
      `Generate 5 LinkedIn hooks for this topic: ${parsed.data.topic}`,
      {
        json: false,
        temperature: 0.8,
        timeout: 25000,
        userId: `free_${ip}`,
        plan: "free",
        cache: false,
      }
    )

    let hooks: string[] = []
    const rawStr = String(raw || "")
    const match = rawStr.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed2 = JSON.parse(match[0])
      if (Array.isArray(parsed2) && parsed2.length > 0) {
        hooks = parsed2.slice(0, 5).map((h: unknown) => String(h).trim())
      }
    }

    if (hooks.length === 0) {
      hooks = rawStr
        .split("\n")
        .map((line: string) => line.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((line: string) => line.length > 10)
        .slice(0, 5)
    }

    if (hooks.length === 0) {
      return NextResponse.json(
        { error: "Could not generate hooks. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({ hooks })
  } catch (error) {
    console.error("[Free Tool Error]", error)
    return NextResponse.json(
      { error: (error as Error).message || "AI generation failed" },
      { status: 503 }
    )
  }
}
