import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAuth } from "@/lib/server/workspace"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi } from "@/lib/server/ai-router-v2"

type ConversationMessage = {
  role: "user" | "assistant"
  content: string
}

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

export async function GET(req: NextRequest) {
  try {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const userId = planCheck.session.userId
    const supabase = supabaseAdmin()
    const conversationId = req.nextUrl.searchParams.get("conversationId")

    if (conversationId) {
      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .select("id, title, role_context, updated_at")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .single()
      if (convError) throw new Error(convError.message)

      const { data: messages, error: msgError } = await supabase
        .from("conversation_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
      if (msgError) throw new Error(msgError.message)

      return NextResponse.json({ conversation, messages: messages || [] })
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, role_context, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)

    return NextResponse.json({ conversations: data || [] })
  } catch (error) {
    const message = (error as Error).message || "Failed to load strategist chat"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const planCheck = await requirePlan(req, "Pro")
    if (!planCheck.ok) return planCheck.response
    const userId = planCheck.session.userId
    const { message, conversationId, role = "general" } = await req.json()
    const cleanMessage = String(message || "").trim()
    if (!cleanMessage) return NextResponse.json({ error: "Message is required" }, { status: 400 })

    const supabase = supabaseAdmin()
    let convId = String(conversationId || "").trim()
    let title = ""

    if (!convId) {
      const titlePrompt = `Generate a concise 3-5 word title for a conversation that starts with this message. No quotes, no punctuation at end.

Message: ${cleanMessage}`
      const titleResult = await callAi("chat-strategist",
        "You name conversations. Return only the title.",
        titlePrompt,
        { temperature: 0.3, timeout: 5000 }
      )
      title = titleResult.replace(/["']/g, "").replace(/[.?!]+$/g, "").trim().substring(0, 50) || "New Chat"

    } else {
      const { data: existing, error } = await supabase
        .from("conversations")
        .select("id, title")
        .eq("id", convId)
        .eq("user_id", userId)
        .single()
      if (error || !existing?.id) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
      title = existing.title
    }

    const { data: history } = await supabase
      .from("conversation_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(20)

    const typedHistory = (history || []) as ConversationMessage[]
    const roleContext = role !== "general" ? `The user is a ${String(role).replace("_", " ")}. Tailor advice accordingly.` : ""
    const prompt = `You are Qalam, an expert LinkedIn content strategist. ${roleContext}

CONVERSATION HISTORY:
${typedHistory.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER: ${cleanMessage}

Respond with specific, actionable LinkedIn strategy advice. Be concise. Give examples. No generic fluff.`

    const response = await callAi("chat-strategist",
      "You are Qalam, a concise LinkedIn strategy advisor.",
      prompt,
      { temperature: 0.7, timeout: 15000 }
    )

    if (!conversationId) {
      const { data: createdId, error } = await supabase.rpc("create_conversation_with_message", {
        p_user_id: userId,
        p_title: title,
        p_role_context: role,
        p_message: cleanMessage,
        p_assistant_message: response,
      })
      if (error || !createdId) throw new Error(error?.message || "Failed to create conversation")
      convId = createdId
    } else {
      const { error } = await supabase.rpc("append_conversation_turn", {
        p_user_id: userId,
        p_conversation_id: convId,
        p_user_message: cleanMessage,
        p_assistant_message: response,
        p_role_context: role,
      })
      if (error) throw new Error(error.message)
    }

    const { data: titled } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", convId)
      .single()

    return NextResponse.json({
      conversationId: convId,
      message: response,
      title: titled?.title || title,
    })
  } catch (error) {
    console.error("strategist_chat_failed", error)
    const message = (error as Error).message || "Failed to send message"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
