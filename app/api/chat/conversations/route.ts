import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)
    
    // Check user_id
    const userSession = request.headers.get("x-user-id") // Or fetch from session.email mapped to users
    
    // Wait, let's just fetch all conversations for this workspace
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

    // Need user_id, since resolveWorkspaceId doesn't return user_id, let's fetch it via appSession again
    const { requireAppSession } = await import("@/lib/server/app-session")
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
