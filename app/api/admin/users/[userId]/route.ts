import { NextRequest, NextResponse } from "next/server"
import { requireAdminOps } from "@/lib/server/workspace"
import { createServiceClient, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

const writeAudit = (adminEmail: string, targetEmail: string, action: string, oldValue: unknown, newValue: unknown) =>
  supabaseInsert("admin_audit_log", {
    admin_email: adminEmail,
    target_user_email: targetEmail,
    action,
    old_value: oldValue,
    new_value: newValue,
    created_at: new Date().toISOString(),
  }, "return=minimal").catch(() => undefined)

type Params = { params: Promise<{ userId: string }> }

export async function DELETE(request: NextRequest, context: Params) {
  let admin
  try {
    admin = await requireAdminOps(request)
  } catch {
    return notFound()
  }

  const { userId } = await context.params
  if (userId === admin.userId) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 })
  }

  const users = await supabaseSelect<{ id: string; email: string }>(
    "users",
    `id=eq.${encodeURIComponent(userId)}&select=id,email&limit=1`
  ).catch(() => [])
  const target = users?.[0]
  if (!target) return NextResponse.json({ error: "user_not_found" }, { status: 404 })

  // The id check above misses OAuth admins: session.user.id is the provider's
  // external id while the route param is the internal users.id UUID, so they
  // never match. Compare emails as well so an admin can't delete themselves.
  if (admin.email && target.email && target.email.toLowerCase() === admin.email.toLowerCase()) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("delete_user_data", { target_user_id: userId })
  if (error) {
    return NextResponse.json({ error: "deletion_failed" }, { status: 500 })
  }

  await writeAudit(admin.email, target.email, "delete_user", { id: target.id, email: target.email }, null)
  return NextResponse.json({ deleted: true })
}
