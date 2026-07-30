import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

type NotificationRow = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export async function GET(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()
    const [{ data: notifications, error }, { count: unreadCount, error: countError }] = await Promise.all([
      supabase
        .from("app_notifications")
        .select("id, type, title, body, link, read_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .returns<NotificationRow[]>(),
      supabase
        .from("app_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
    ])

    if (error || countError) {
      return NextResponse.json({ error: "Could not load notifications." }, { status: 500 })
    }

    return NextResponse.json({ notifications: notifications || [], unreadCount: unreadCount || 0 })
  })(request)
}
