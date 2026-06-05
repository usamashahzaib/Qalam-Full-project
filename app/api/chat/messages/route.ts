import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { requirePlan } from "@/lib/server/require-plan"

type DbMessage = { id: string; conversation_id: string; role: "user" | "assistant" | "system"; content: string; created_at: string }
type DbConversation = { id: string; workspace_id: string }

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request)
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response

    const conversationId = request.nextUrl.searchParams.get("conversationId")
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

    const messages = await supabaseSelect<DbMessage>("messages", `conversation_id=eq.${conversationId}&order=created_at.asc`)
    
    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    if (message === "auth_required") return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response
    const { workspaceId } = planCheck

    const body = await request.json()
    const { conversationId, content } = body

    if (!conversationId || !content) {
      return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 })
    }

    // Verify conversation belongs to workspace
    const convCheck = await supabaseSelect<DbConversation>("conversations", `id=eq.${conversationId}&workspace_id=eq.${workspaceId}&limit=1`)
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
    const history = await supabaseSelect<DbMessage>("messages", `conversation_id=eq.${conversationId}&order=created_at.asc`)
    const formattedHistory = (history || []).map((m) => ({
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
              "You are Qalam AI Strategist, a human LinkedIn ghostwriter and content operator. Never sound like ChatGPT. No markdown headings, no bold markers, no generic frameworks, no corporate filler, no em dashes. Use plain spoken English, specific tradeoffs, lived examples, and ready-to-paste posts. If asked for a post, output only the post body unless the user asks for strategy. Avoid: navigate, leverage, foster, transformative, unlock potential, rapidly evolving landscape, future belongs, in conclusion.",
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

    const aiText = String(data.choices?.[0]?.message?.content || "")
      .replace(/[--]/g, "-")
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .trim()

    // 4. Insert AI Message
    const aiMsg = await supabaseInsert("messages", {
      conversation_id: conversationId,
      role: "assistant",
      content: aiText
    }, "return=representation")

    return NextResponse.json({ message: aiMsg?.[0] })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    if (message === "auth_required") return NextResponse.json({ error: "Please sign in again." }, { status: 401 })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
