import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { createServiceClient, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async (request: NextRequest) => {
  const adminKey = request.headers.get("x-admin-key") || ""
  const secretKey = process.env.ADMIN_SECRET_KEY || ""
  const keyBuf = Buffer.from(adminKey)
  const secretBuf = Buffer.from(secretKey)
  if (!secretKey || keyBuf.length !== secretBuf.length || !timingSafeEqual(keyBuf, secretBuf)) throw new Error("Forbidden")
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  if (!isAdminEmail(session.user.email)) throw new Error("Forbidden")
  return { email: session.user.email || "", userId: session.user.id }
}

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
    admin = await requireAdmin(request)
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
