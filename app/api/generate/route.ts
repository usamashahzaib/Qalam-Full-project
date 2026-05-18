import { NextRequest, NextResponse } from "next/server"
import { groqApiKey } from "@/lib/server/env"
import { requireAppSession } from "@/lib/server/app-session"
import { rateLimit } from "@/lib/server/rate-limit"

type GenerateBody = {
  prompt?: string
  postType?: string
  title?: string
  profile?: {
    name?: string
    title?: string
    industry?: string
    tone?: string
    goals?: string[]
  }
}

const buildSystemPrompt = ({ profile, postType, title }: GenerateBody) => {
  const goals = Array.isArray(profile?.goals) ? profile!.goals.filter(Boolean).join(", ") : ""

  return [
    "You are an expert LinkedIn ghostwriter.",
    "Write one polished LinkedIn draft based on the user's prompt.",
    postType ? `Format target: ${postType}.` : "",
    title ? `Working title: ${title}.` : "",
    profile?.name ? `Writer name: ${profile.name}.` : "",
    profile?.title ? `Writer role: ${profile.title}.` : "",
    profile?.industry ? `Industry context: ${profile.industry}.` : "",
    profile?.tone ? `Tone to match: ${profile.tone}.` : "",
    goals ? `Content goals: ${goals}.` : "",
    "Keep it specific, professional, natural, and concise.",
    "Do not include hashtags unless the user asks.",
    "Do not include preamble, labels, quotation marks, or explanations.",
    "Return only the post body.",
  ].filter(Boolean).join(" ")
}

export async function POST(request: NextRequest) {
  try {
    const session = requireAppSession(request)

    if (!rateLimit(`gen_${session.email}`, 10, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 })
    }

    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 503 })
    }

    const body = (await request.json()) as GenerateBody
    const prompt = String(body.prompt || "").trim()
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(body),
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
      cache: "no-store",
    })

    const raw = await response.text()
    const data = raw ? JSON.parse(raw) : {}

    if (!response.ok) {
      const message = data?.error?.message || data?.message || "Failed to generate content."
      console.error("Groq API error:", message)
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const text = String(data?.choices?.[0]?.message?.content || "").trim()
    if (!text) {
      return NextResponse.json({ error: "AI returned an empty draft." }, { status: 502 })
    }

    return NextResponse.json({ text })
  } catch (error) {
    const message = (error as Error).message || "Internal server error"
    if (message === "auth_required") {
      return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    }
    console.error("Generate error:", error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
