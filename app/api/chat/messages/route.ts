import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { requirePlan } from "@/lib/server/require-plan"

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const planCheck = await requirePlan(request, "Pro")
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
