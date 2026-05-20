import { NextRequest, NextResponse } from "next/server"
import { requireAppSession, resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const conversations = await supabaseSelect<any>("conversations", `workspace_id=eq.${workspaceId}&order=updated_at.desc`)
    return NextResponse.json({ conversations: conversations || [] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const title = body.title || "New Conversation"

    const session = requireAppSession(request)
    const users = await supabaseSelect<{ id: string }>("users", `email=eq.${encodeURIComponent(session.email)}&limit=1`)
    const userId = users?.[0]?.id

    if (!userId) {
       return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const conv = await supabaseInsert("conversations", {
      workspace_id: workspaceId,
      user_id: userId,
      title
    }, "return=representation")

    return NextResponse.json({ conversation: conv?.[0] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const body = await request.json()
    const conversationId = String(body.conversationId || "")
    const title = String(body.title || "").trim()

    if (!conversationId || !title) {
      return NextResponse.json({ error: "Missing conversationId or title" }, { status: 400 })
    }

    const existing = await supabaseSelect<any>("conversations", `id=eq.${conversationId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!existing?.length) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    const rows = await supabasePatch("conversations", `id=eq.${conversationId}`, {
      title,
      updated_at: new Date().toISOString(),
    })
    return NextResponse.json({ conversation: rows?.[0] || null })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    const conversationId = request.nextUrl.searchParams.get("conversationId")

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })
    }

    const existing = await supabaseSelect<any>("conversations", `id=eq.${conversationId}&workspace_id=eq.${workspaceId}&limit=1`)
    if (!existing?.length) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    await supabaseDelete("messages", `conversation_id=eq.${conversationId}`)
    await supabaseDelete("conversations", `id=eq.${conversationId}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
