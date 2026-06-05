import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { callAi } from "@/lib/server/ai-router"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { ensureWorkspaceForUser, getClerkAuthContext } from "@/lib/server/workspace"

type HistoryMessage = {
  role: string
  content: string
}

async function resolveWorkspaceId(workspaceKey: string | undefined, supabaseUserId: string, firstName: string) {
  const supabase = createServiceClient()

  if (workspaceKey) {
    const { data: membership } = await supabase
      .from("memberships")
      .select("workspace_id")
      .eq("user_id", supabaseUserId)
      .eq("workspace_id", workspaceKey)
      .maybeSingle()
    if (membership?.workspace_id) return membership.workspace_id
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("workspace_id")
    .eq("user_id", supabaseUserId)
    .limit(1)
    .maybeSingle()

  if (membership?.workspace_id) return membership.workspace_id
  return ensureWorkspaceForUser({ userId: supabaseUserId, firstName })
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: "auth_required" }, { status: 401 })

    const body = await request.json()
    const message = String(body.message || "").trim()
    const conversationId = body.conversationId as string | undefined
    const role = body.role || "ceo-founder"
    const workspaceKey = body.workspaceKey as string | undefined

    if (!message) {
      return NextResponse.json({ error: "message_required" }, { status: 400 })
    }

    const ctx = await getClerkAuthContext()
    const supabase = createServiceClient()
    const workspaceId = await resolveWorkspaceId(workspaceKey, ctx.supabaseUserId, ctx.firstName)

    let activeConversationId = conversationId
    let conversationTitle: string | null = null
    let history: HistoryMessage[] = []

    if (conversationId) {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, title, workspace_id")
        .eq("id", conversationId)
        .eq("workspace_id", workspaceId)
        .maybeSingle()

      if (!conversation) {
        return NextResponse.json({ error: "conversation_not_found" }, { status: 404 })
      }

      conversationTitle = conversation.title
      activeConversationId = conversation.id

      const { data: messages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })

      history = (messages || []) as HistoryMessage[]
    }

    let topicName = conversationTitle && conversationTitle !== "New Conversation" ? conversationTitle : null
    if (!topicName) {
      const namePrompt = `Generate a 3-5 word topic name for this conversation starter: "${message}". Return ONLY the topic name, no quotes.`
      topicName = await callAi(
        "You are a topic naming assistant. Generate concise, descriptive topic names.",
        namePrompt,
        { temperature: 0.3, timeout: 5000 }
      )
      topicName = topicName.replace(/["']/g, "").trim().substring(0, 50)
    }

    const contextMessages = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n")

    const systemPrompt = `You are a LinkedIn content strategist. Help the user plan, brainstorm, and improve their LinkedIn content strategy. You are writing for a ${role}.

Be specific. Give actionable advice. Use examples. Do not be generic.

If they ask for post ideas, give 3-5 specific ideas with hooks.
If they ask for feedback on a post, be honest about what works and what doesn't.
If they ask for strategy, give a week-by-week plan.

Previous context:
${contextMessages}`

    const response = await callAi(systemPrompt, message, { temperature: 0.7, timeout: 15000 })

    if (!activeConversationId) {
      const { data: created, error: createError } = await supabase
        .from("conversations")
        .insert({
          workspace_id: workspaceId,
          user_id: ctx.supabaseUserId,
          title: topicName,
        })
        .select("id")
        .single()

      if (createError || !created?.id) {
        console.error("strategist_conversation_create_failed", createError)
        return NextResponse.json({ error: "failed_to_create_conversation" }, { status: 500 })
      }

      activeConversationId = created.id
    } else if (topicName !== conversationTitle) {
      await supabase
        .from("conversations")
        .update({ title: topicName, updated_at: new Date().toISOString() })
        .eq("id", activeConversationId)
    } else {
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activeConversationId)
    }

    const { data: insertedMessages, error: messageError } = await supabase
      .from("messages")
      .insert([
        { conversation_id: activeConversationId, role: "user", content: message },
        { conversation_id: activeConversationId, role: "assistant", content: response },
      ])
      .select("id, role, content, created_at")

    if (messageError) {
      console.error("strategist_message_insert_failed", messageError)
      return NextResponse.json({ error: "failed_to_save_messages" }, { status: 500 })
    }

    const assistantMessage = insertedMessages?.find((item) => item.role === "assistant")

    return NextResponse.json({
      response,
      topicName,
      conversationId: activeConversationId,
      message: assistantMessage
        ? {
            id: assistantMessage.id,
            role: "assistant" as const,
            content: assistantMessage.content,
            created_at: assistantMessage.created_at,
          }
        : null,
    })
  } catch (error) {
    console.error("strategist_error", error)
    return NextResponse.json({ error: (error as Error).message || "server_error" }, { status: 500 })
  }
}
