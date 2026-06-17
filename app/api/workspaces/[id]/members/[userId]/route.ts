import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

const patchSchema = z.object({
  role: z.enum(["editor", "viewer"]),
})

type Params = { params: Promise<{ id: string; userId: string }> }

async function verifyOwner(workspaceId: string, callerId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", callerId)
    .maybeSingle()
  return data?.role === "owner"
}

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (req, user) => {
    const { id: workspaceId, userId: targetUserId } = await params

    if (!(await verifyOwner(workspaceId, user.id))) {
      return NextResponse.json({ error: "only_owner_can_change_roles" }, { status: 403 })
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "cannot_change_own_role" }, { status: 400 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("workspace_members")
      .update({ role: parsed.data.role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, role: parsed.data.role })
  })(request)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(async (_req, user) => {
    const { id: workspaceId, userId: targetUserId } = await params

    if (!(await verifyOwner(workspaceId, user.id))) {
      return NextResponse.json({ error: "only_owner_can_remove_members" }, { status: 403 })
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "owner_cannot_remove_self" }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", targetUserId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
