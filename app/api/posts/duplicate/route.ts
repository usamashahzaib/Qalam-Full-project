import { NextRequest, NextResponse } from "next/server"
import { requireAuth, resolveWorkspaceId, getWorkspaceSessionContext } from "@/lib/server/workspace"
import { errorToStatus } from "@/lib/server/roles"
import { SupabasePostRepository } from "@/lib/repositories/supabase/SupabasePostRepository"

const postRepo = new SupabasePostRepository()

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const workspaceId = await resolveWorkspaceId(request)
    const ctx = await getWorkspaceSessionContext()

    const body = await request.json()
    const postId = String(body.postId || "").trim()
    if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

    const post = await postRepo.duplicate(postId, workspaceId, ctx.supabaseUserId, ctx.supabaseUserId)
    return NextResponse.json({ post }, { status: 201 })
  } catch (error) {
    const msg = (error as Error).message
    return NextResponse.json({ error: msg }, { status: errorToStatus(msg) })
  }
}
