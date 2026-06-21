import { NextRequest, NextResponse } from "next/server"
import { requirePlan } from "@/lib/server/require-plan"
import { callAi } from "@/lib/server/ai-router-v2"
import { createServiceClient } from "@/lib/server/supabase-rest"

type HistoryMessage = { role: "user" | "assistant"; content: string }

export async function POST(request: NextRequest) {
  try {
    const planCheck = await requirePlan(request, "Pro")
    if (!planCheck.ok) return planCheck.response
    const userId = planCheck.session.userId
    const body = await request.json()
    const message = String(body.message || "").trim()
    const role = String(body.role || "general")
    let conversationId = String(body.conversationId || "").trim()
    let title = ""

    if (!message) return NextResponse.json({ error: "message_required" }, { status: 400 })

    const supabase = createServiceClient()
    let history: HistoryMessage[] = []

    const shouldNameExisting = (value: string) => !value || value === "New Conversation" || value === "New Chat"
    if (conversationId) {
      const { data: conversation, error } = await supabase
        .from("conversations")
        .select("id, title")
        .eq("id", conversationId)
        .eq("user_id", userId)
        .maybeSingle()
      if (error || !conversation) return NextResponse.json({ error: "conversation_not_found" }, { status: 404 })
      title = conversation.title

      const { data } = await supabase
        .from("conversation_messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20)
      history = (data || []) as HistoryMessage[]
    }

    if (!conversationId || shouldNameExisting(title)) {
      const namePrompt = `Generate a 3-5 word topic name for this conversation starter: "${message}". Return ONLY the topic name, no quotes.`
      title = (await callAi("chat-strategist",
        "You are a topic naming assistant. Generate concise, descriptive topic names.",
        namePrompt,
        { temperature: 0.3, timeout: 5000 }
      )).replace(/["']/g, "").trim().substring(0, 50) || "New Chat"
    }

    const roleContext = role !== "general" ? `The user is a ${role.replace("_", " ")}. Tailor advice accordingly.` : ""
    const prompt = `You are Qalam, an expert LinkedIn content strategist. ${roleContext}

CONVERSATION HISTORY:
${history.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

USER: ${message}

Respond with specific, actionable LinkedIn strategy advice. Be concise. Give examples. No generic fluff.`

    const response = await callAi("chat-strategist", "You are Qalam, a concise LinkedIn strategy advisor.", prompt, {
      temperature: 0.7,
      timeout: 15000,
    })

    if (conversationId) {
      const { error } = await supabase.rpc("append_conversation_turn", {
        p_user_id: userId,
        p_conversation_id: conversationId,
        p_user_message: message,
        p_assistant_message: response,
        p_role_context: role,
        p_title: title,
      })
      if (error) throw new Error(error.message)
    } else {
      const { data: createdId, error } = await supabase.rpc("create_conversation_with_message", {
        p_user_id: userId,
        p_title: title,
        p_role_context: role,
        p_message: message,
        p_assistant_message: response,
      })
      if (error || !createdId) throw new Error(error?.message || "failed_to_create_conversation")
      conversationId = createdId
    }

    return NextResponse.json({
      response,
      topicName: title,
      conversationId,
      message: { role: "assistant" as const, content: response, created_at: new Date().toISOString() },
    })
  } catch (error) {
    console.error("strategist_error", error)
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
