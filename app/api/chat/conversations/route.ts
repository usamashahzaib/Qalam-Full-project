import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/clerk-client"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json({ conversations: data || [] })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = await request.json()
    const title = String(body.title || "New Conversation").trim() || "New Conversation"
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title })
      .select("id, title, updated_at")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ conversation: data })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const body = await request.json()
    const conversationId = String(body.conversationId || "")
    const title = String(body.title || "").trim()

    if (!conversationId || !title) {
      return NextResponse.json({ error: "Missing conversationId or title" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from("conversations")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select("id, title, updated_at")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ conversation: data })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const conversationId = request.nextUrl.searchParams.get("conversationId")
    if (!conversationId) return NextResponse.json({ error: "Missing conversationId" }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
