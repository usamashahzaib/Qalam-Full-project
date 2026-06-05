import { NextRequest, NextResponse } from "next/server"
import { callAi } from "@/lib/ai-router"
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit"

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  const rate = await checkRateLimit(`hook-gen:${ip}`, "Free", ip)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", message: "Too many requests. Please wait a moment.", ...rate },
      { status: 429 }
    )
  }

  let topic: string
  try {
    const body = await request.json()
    topic = (body?.topic || "").trim()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (!topic) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 })
  }
  if (topic.length > 300) {
    return NextResponse.json({ error: "Topic too long (max 300 characters)" }, { status: 400 })
  }

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

  const userMessage = `Generate 5 LinkedIn hooks for this topic: ${topic}`

  try {
    const raw = await callAi(systemPrompt, userMessage, { json: false, temperature: 0.8 })

    let hooks: string[] = []
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        hooks = parsed.slice(0, 5).map((h: unknown) => String(h).trim())
      }
    }

    if (hooks.length === 0) {
      hooks = raw
        .split("\n")
        .map((line) => line.replace(/^\d+\.\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((line) => line.length > 10)
        .slice(0, 5)
    }

    if (hooks.length === 0) {
      return NextResponse.json({ error: "Could not generate hooks. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ hooks })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg || "AI generation failed" }, { status: 500 })
  }
}
