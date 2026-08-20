import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient, createScopedClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"
import { APP_URL } from "@/lib/seo"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["editor", "viewer", "client_reviewer"]).default("editor"),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const planCheck = await requirePlan(req, "Agency")
    if (!planCheck.ok) return planCheck.response

    const { id: workspaceId } = await context.params
    // rpc calls and lookups against tables with no workspace_id column
    // (users, workspaces) stay on the raw client; workspace_members and
    // workspace_invites queries below use the workspace-scoped one.
    const supabase = createServiceClient()
    const scoped = createScopedClient(workspaceId)

    // Owners and admins can invite. Editors and read-only roles cannot.
    // and agency staff who manage client workspaces need this too.
    try {
      await requireRole(req, workspaceId, "admin")
    } catch {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 })
    }

    const { email, role } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    // Prevent self-invite
    if (normalizedEmail === (user.email ?? "").toLowerCase()) {
      return NextResponse.json({ error: "cannot_invite_yourself" }, { status: 400 })
    }

    // Look up user by email
    const { data: invitee } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", normalizedEmail)
      .maybeSingle()

    const [{ count: memberCount }, { count: pendingCount }] = await Promise.all([
      scoped.from("workspace_members").select("user_id", { count: "exact", head: true }),
      scoped.from("workspace_invites").select("email", { count: "exact", head: true })
        .gt("expires_at", new Date().toISOString()).neq("email", normalizedEmail),
    ])
    const seats = planCheck.limits.seats
    const reservedSeats = (memberCount ?? 0) + (pendingCount ?? 0)
    if (seats !== "unlimited" && reservedSeats >= seats) {
      return NextResponse.json(
        { error: "seat_limit_reached", featureName: "seats", limit: seats, current: reservedSeats },
        { status: 403 }
      )
    }

    if (!invitee) {
      // User doesn't have a Qalam account yet - save a pending invite and send an email.
      // When they sign up, the signup route redeems pending invites automatically.
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle()

      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: reserved, error: reserveError } = await supabase.rpc("reserve_workspace_invite_with_limit", {
        p_workspace_id: workspaceId,
        p_email: normalizedEmail,
        p_role: role,
        p_invited_by: user.id,
        p_expires_at: inviteExpiresAt,
        p_seat_limit: seats === "unlimited" ? null : seats,
      })
      if (reserveError) return NextResponse.json({ error: "invite_reservation_failed" }, { status: 500 })
      if (!reserved) return NextResponse.json({ error: "seat_limit_reached", featureName: "seats", limit: seats }, { status: 403 })

      await sendTransactionalEmail({
        to: email,
        subject: `${user.name ?? "Someone"} invited you to Qalam`,
        text: [
          `You've been invited to join the "${workspace?.name ?? "Qalam"}" workspace.`,
          ``,
          `Sign up at ${APP_URL} to accept this invitation - you'll be added automatically.`,
          ``,
          `- The Qalam team`,
        ].join("\n"),
      }).catch(() => undefined)

      return NextResponse.json({ invited: true, status: "email_sent_no_account" })
    }

    // Check if already a member
    const { data: existingRaw } = await scoped
      .from("workspace_members")
      .select("role")
      .eq("user_id", invitee.id)
      .maybeSingle()
    const existing = existingRaw as unknown as { role: string } | null

    if (existing) {
      return NextResponse.json({ error: "already_a_member", currentRole: existing.role }, { status: 409 })
    }

    // Add to workspace
    const { data: added, error: insertErr } = await supabase.rpc("add_workspace_member_with_limit", {
      p_workspace_id: workspaceId,
      p_user_id: invitee.id,
      p_role: role,
      p_seat_limit: seats === "unlimited" ? null : seats,
    })
    if (insertErr) return NextResponse.json({ error: "workspace_member_add_failed" }, { status: 500 })
    if (!added) return NextResponse.json({ error: "seat_limit_reached", featureName: "seats", limit: seats }, { status: 403 })

    // Notify the invitee
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle()

    await sendTransactionalEmail({
      to: invitee.email,
      subject: `${user.name ?? "Someone"} added you to a Qalam workspace`,
      text: [
        `Hi ${invitee.full_name ?? "there"},`,
        ``,
        `You've been added to the "${workspace?.name ?? "Qalam"}" workspace as ${role}.`,
        ``,
        `Open Qalam: ${APP_URL}/dashboard`,
        ``,
        `- The Qalam team`,
      ].join("\n"),
    }).catch(() => undefined)

    return NextResponse.json({ invited: true, userId: invitee.id, role })
  })(request)
}
