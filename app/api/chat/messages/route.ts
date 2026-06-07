import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { groqApiKey } from "@/lib/server/env"
import { requirePlan } from "@/lib/server/require-plan"

type DbMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string }

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response

    const conversationId = request.nextUrl.searchParams.get("conversationId")
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

    const supabase = createServiceClient()
    const { data: owner } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle()
    if (!owner) return NextResponse.json({ error: "Unauthorized conversation" }, { status: 403 })

    const { data, error } = await supabase
      .from("conversation_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
    if (error) throw new Error(error.message)

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message === "auth_required" ? "Please sign in again." : message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const planCheck = await requirePlan(request, "Free")
    if (!planCheck.ok) return planCheck.response

    const { conversationId, content } = await request.json()
    const cleanContent = String(content || "").trim()
    if (!conversationId || !cleanContent) {
      return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle()
    if (!conversation) return NextResponse.json({ error: "Unauthorized conversation" }, { status: 403 })

    const { data: history, error: historyError } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20)
    if (historyError) throw new Error(historyError.message)

    if (!groqApiKey) return NextResponse.json({ error: "AI generation is not configured" }, { status: 503 })

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
          ...(history || []).map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: cleanContent },
        ],
        temperature: 0.4,
      }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data?.error?.message || "AI failed to respond")

    const aiText = String(data.choices?.[0]?.message?.content || "")
      .replace(/[--]/g, "-")
      .replace(/\*\*/g, "")
      .replace(/^#+\s*/gm, "")
      .trim()

    const { error } = await supabase.rpc("append_conversation_turn", {
      p_user_id: userId,
      p_conversation_id: conversationId,
      p_user_message: cleanContent,
      p_assistant_message: aiText,
      p_role_context: "general",
    })
    if (error) throw new Error(error.message)

    const { data: latest } = await supabase
      .from("conversation_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<DbMessage>()

    return NextResponse.json({ message: latest || { role: "assistant", content: aiText, created_at: new Date().toISOString() } })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message === "auth_required" ? "Please sign in again." : message }, { status: (message === "auth_required" || message === "Unauthorized") ? 401 : 500 })
  }
}
