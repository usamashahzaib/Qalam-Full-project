import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId } from "@/lib/server/workspace"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { errorToStatus } from "@/lib/server/roles"

const PER_PAGE = 20

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)

    const url = new URL(request.url)
    const type = url.searchParams.get("type") || ""
    const status = url.searchParams.get("status") || ""
    const search = url.searchParams.get("search") || ""
    const sort = url.searchParams.get("sort") || "newest"
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
    const from = url.searchParams.get("from") || ""
    const to = url.searchParams.get("to") || ""

    const supabase = createServiceClient()
    let query = supabase
      .from("posts")
      .select("id, title, content, type, status, scheduled_time, published_at, created_at, updated_at", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)

    if (type && type !== "all") {
      if (type === "carousel") {
        query = query.ilike("type", "%carousel%")
      } else {
        query = query.not("type", "ilike", "%carousel%")
      }
    }

    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    if (from) query = query.gte("created_at", `${from}T00:00:00`)
    if (to) query = query.lte("created_at", `${to}T23:59:59`)

    const orderCol = sort === "oldest" ? "created_at" : "created_at"
    const ascending = sort === "oldest"
    query = query.order(orderCol, { ascending }).range((page - 1) * PER_PAGE, page * PER_PAGE - 1)

    const { data, count, error } = await query
    if (error) throw new Error(error.message)

    const posts = (data || []).map((p) => ({
      id: p.id,
      title: p.title,
      content: (p.content || "").slice(0, 200),
      type: p.type,
      status: p.status,
      date: (p.scheduled_time || p.published_at || p.created_at || "").slice(0, 10),
      scheduledTime: p.scheduled_time,
      updatedAt: p.updated_at,
      createdAt: p.created_at,
    }))

    return NextResponse.json({
      posts,
      total: count ?? 0,
      page,
      perPage: PER_PAGE,
      totalPages: Math.ceil((count ?? 0) / PER_PAGE),
    })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
