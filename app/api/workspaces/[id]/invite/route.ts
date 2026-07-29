import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { requirePlan } from "@/lib/server/require-plan"
import { requireRole } from "@/lib/server/roles"
import { createServiceClient } from "@/lib/server/supabase-rest"
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
    const supabase = createServiceClient()

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

    // Prevent self-invite
    if (email.toLowerCase() === (user.email ?? "").toLowerCase()) {
      return NextResponse.json({ error: "cannot_invite_yourself" }, { status: 400 })
    }

    // Look up user by email
    const { data: invitee } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle()

    if (!invitee) {
      // User doesn't have a Qalam account yet - save a pending invite and send an email.
      // When they sign up, the signup route redeems pending invites automatically.
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle()

      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from("workspace_invites")
        .upsert(
          { workspace_id: workspaceId, email: email.toLowerCase().trim(), role, invited_by: user.id, expires_at: inviteExpiresAt, created_at: new Date().toISOString() },
          { onConflict: "workspace_id,email" }
        )
        .then(undefined, () => undefined)

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
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", invitee.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: "already_a_member", currentRole: existing.role }, { status: 409 })
    }

    const { count } = await supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
    const seats = planCheck.limits.seats
    if (seats !== "unlimited" && (count ?? 0) >= seats) {
      return NextResponse.json(
        { error: "seat_limit_reached", featureName: "seats", limit: seats, current: count ?? 0 },
        { status: 403 }
      )
    }

    // Add to workspace
    const { error: insertErr } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: invitee.id, role })

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

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
