import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { sendTransactionalEmail } from "@/lib/server/email"

const schema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["editor", "viewer"]).default("editor"),
})

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return withAuth(async (req, user) => {
    const { id: workspaceId } = await context.params
    const supabase = createServiceClient()

    // Only the workspace owner can invite
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (!membership) return NextResponse.json({ error: "forbidden" }, { status: 403 })
    if (membership.role !== "owner") return NextResponse.json({ error: "only_owner_can_invite" }, { status: 403 })

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
      // User doesn't have a Qalam account yet — send an invite email but don't create membership
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .maybeSingle()

      await sendTransactionalEmail({
        to: email,
        subject: `${user.name ?? "Someone"} invited you to Qalam`,
        text: [
          `You've been invited to join the "${workspace?.name ?? "Qalam"}" workspace.`,
          ``,
          `Sign up at https://byqalam.com to accept this invitation.`,
          ``,
          `— The Qalam team`,
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
        `Open Qalam: https://byqalam.com/dashboard`,
        ``,
        `— The Qalam team`,
      ].join("\n"),
    }).catch(() => undefined)

    return NextResponse.json({ invited: true, userId: invitee.id, role })
  })(request)
}
