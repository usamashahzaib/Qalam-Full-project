import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createScopedClient } from "@/lib/server/supabase-rest"

const patchSchema = z.object({
  role: z.enum(["editor", "viewer", "client_reviewer"]),
})
const memberParamsSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() })

type Params = { params: Promise<{ id: string; userId: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  return withAuth(async (req, user) => {
    const parsedParams = memberParamsSchema.safeParse(await params)
    if (!parsedParams.success) return NextResponse.json({ error: "invalid_workspace_member" }, { status: 400 })
    const { id: workspaceId, userId: targetUserId } = parsedParams.data
    const planCheck = await requirePlan(req, "Agency", workspaceId)
    if (!planCheck.ok) return planCheck.response

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "only_admins_can_change_roles" }, { status: 403 })
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "cannot_change_own_role" }, { status: 400 })
    }

    const scoped = createScopedClient(workspaceId)
    const { data: targetMembership } = await scoped
      .from("workspace_members")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle()
    if (!targetMembership) return NextResponse.json({ error: "member_not_found" }, { status: 404 })
    if ((targetMembership as unknown as { role: string }).role === "owner") {
      return NextResponse.json({ error: "owner_membership_protected" }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { error } = await scoped
      .from("workspace_members")
      .update({ role: parsed.data.role })
      .eq("user_id", targetUserId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, role: parsed.data.role })
  })(request)
}

export async function DELETE(request: NextRequest, { params }: Params) {
  return withAuth(async (req, user) => {
    const parsedParams = memberParamsSchema.safeParse(await params)
    if (!parsedParams.success) return NextResponse.json({ error: "invalid_workspace_member" }, { status: 400 })
    const { id: workspaceId, userId: targetUserId } = parsedParams.data
    const planCheck = await requirePlan(req, "Agency", workspaceId)
    if (!planCheck.ok) return planCheck.response

    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "only_admins_can_remove_members" }, { status: 403 })
    }
    if (targetUserId === user.id) {
      return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 })
    }

    const scoped = createScopedClient(workspaceId)
    const { data: targetMembership } = await scoped
      .from("workspace_members")
      .select("role")
      .eq("user_id", targetUserId)
      .maybeSingle()
    if (!targetMembership) return NextResponse.json({ error: "member_not_found" }, { status: 404 })
    if ((targetMembership as unknown as { role: string }).role === "owner") {
      return NextResponse.json({ error: "owner_membership_protected" }, { status: 403 })
    }

    const { error } = await scoped
      .from("workspace_members")
      .delete()
      .eq("user_id", targetUserId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  })(request)
}
