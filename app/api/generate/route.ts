import { NextRequest, NextResponse } from "next/server"
import { groqApiKey } from "@/lib/server/env"
import { requireAppSession } from "@/lib/server/app-session"
import { rateLimit } from "@/lib/server/rate-limit"

export async function POST(request: NextRequest) {
  try {
    // Ensure the user is authenticated
    const session = requireAppSession(request)

    // Rate Limit: 10 requests per minute per user
    if (!rateLimit(`gen_${session.email}`, 10, 60)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 })
    }

    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured on this server." }, { status: 501 })
    }

    const { prompt } = await request.json()
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama3-8b-8192",
        messages: [
          {
            role: "system",
            content: "You are an expert LinkedIn ghostwriter. Write a professional, engaging LinkedIn post based on the user's prompt. Do not include hashtags unless asked. Do not include introductory conversational text, just return the post content directly. Keep it authentic and concise.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Groq API error:", errorText)
      return NextResponse.json({ error: "Failed to generate content" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json({ text: data.choices?.[0]?.message?.content || "" })
  } catch (error) {
    console.error("Generate error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
