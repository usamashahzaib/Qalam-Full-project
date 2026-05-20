import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const conversationId = request.nextUrl.searchParams.get("conversationId")
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

    const messages = await supabaseSelect<any>("messages", `conversation_id=eq.${conversationId}&order=created_at.asc`)
    
    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const { conversationId, content } = body

    if (!conversationId || !content) {
      return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 })
    }

    // Verify conversation belongs to workspace
    const convCheck = await supabaseSelect<any>("conversations", `id=eq.${conversationId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!convCheck || convCheck.length === 0) {
      return NextResponse.json({ error: "Unauthorized conversation" }, { status: 403 })
    }

    // 1. Insert User Message
    await supabaseInsert("messages", {
      conversation_id: conversationId,
      role: "user",
      content
    })

    // 2. Fetch Chat History
    const history = await supabaseSelect<any>("messages", `conversation_id=eq.${conversationId}&order=created_at.asc`)
    const formattedHistory = (history || []).map((m: any) => ({
      role: m.role,
      content: m.content
    }))

    // 3. Get AI Response
    if (!groqApiKey) {
      return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 })
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
            content:
              "You are Qalam AI Strategist. Reply short, precise, and useful. Follow the user's wording closely. Prefer direct next steps, sharp bullets, and done-for-you drafts over generic coaching. If the user says they do not know, take the lead.",
          },
          ...formattedHistory,
        ],
        temperature: 0.4,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error?.message || "AI failed to respond")
    }

    const aiText = data.choices?.[0]?.message?.content || ""

    // 4. Insert AI Message
    const aiMsg = await supabaseInsert("messages", {
      conversation_id: conversationId,
      role: "assistant",
      content: aiText
    }, "return=representation")

    return NextResponse.json({ message: aiMsg?.[0] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
