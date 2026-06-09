import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function GET() {
  try {
    const userId = await requireAuth()
    const supabase = createServiceClient()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data, error } = await supabase
      .from("posts")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: "Failed to load usage" }, { status: 500 })
    }

    const today = now.getDate()
    const days = Array.from({ length: today }, (_, i) => i + 1)

    const rows = (data ?? []) as { created_at: string }[]
    const usage = days.map((day) => ({
      day,
      draftsUsed: rows.filter((r) => new Date(r.created_at).getDate() === day).length,
    }))

    return NextResponse.json(usage)
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json(
      { error: msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
