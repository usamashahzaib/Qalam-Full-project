import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"

const patchSchema = z.object({
  role: z.enum(["editor", "viewer", "client_reviewer"]),
})

type Params = { params: Promise<{ id: string; userId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Agency")
    if (!planCheck.ok) return planCheck.response

    const { id: workspaceId, userId: targetUserId } = await params

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "only_admins_can_change_roles" }, { status: 403 })
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
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Agency")
    if (!planCheck.ok) return planCheck.response

    const { id: workspaceId, userId: targetUserId } = await params

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "only_admins_can_remove_members" }, { status: 403 })
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 })
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
