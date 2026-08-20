import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceId } from "@/lib/server/workspace"
import { createScopedClient } from "@/lib/server/supabase-rest"

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId(request)

    const { data, error } = await createScopedClient(workspaceId)
      .from("posts")
      .select("id,title,content,engagement_score,status,created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({ error: "Failed to load posts" }, { status: 500 })
    }

    type Row = {
      id: string
      title?: string | null
      content?: string | null
      engagement_score?: number | null
      status: string
      created_at: string
    }

    const posts = ((data ?? []) as unknown as Row[]).map((row: Row) => ({
      id: row.id,
      title: (row.title || row.content || "Untitled post").split("\n")[0].slice(0, 100),
      date: row.created_at,
      score: row.engagement_score ?? null,
      status: row.status ?? "draft",
    }))

    return NextResponse.json(posts)
  } catch (err) {
    const msg = (err as Error).message
    return NextResponse.json(
      { error: msg },
      { status: msg === "auth_required" ? 401 : 500 }
    )
  }
}
