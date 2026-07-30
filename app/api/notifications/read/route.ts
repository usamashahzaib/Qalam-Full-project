import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    const body = (await req.json().catch(() => null)) as { id?: string; all?: boolean } | null
    const supabase = createServiceClient()
    const now = new Date().toISOString()

    if (body?.all) {
      const { error } = await supabase
        .from("app_notifications")
        .update({ read_at: now })
        .eq("user_id", user.id)
        .is("read_at", null)
      if (error) return NextResponse.json({ error: "Could not mark notifications read." }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    const id = typeof body?.id === "string" ? body.id : ""
    if (!id) return NextResponse.json({ error: "Missing notification id." }, { status: 400 })

    const { error } = await supabase
      .from("app_notifications")
      .update({ read_at: now })
      .eq("id", id)
      .eq("user_id", user.id)
    if (error) return NextResponse.json({ error: "Could not mark notification read." }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
