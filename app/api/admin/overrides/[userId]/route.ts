import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/server/workspace"
import { supabaseDelete, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async (request: NextRequest) => {
  const adminKey = request.headers.get("x-admin-key") || ""
  const secretKey = process.env.ADMIN_SECRET_KEY || ""
  if (!secretKey || adminKey !== secretKey) throw new Error("Forbidden")
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.APP_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase())
  if (!adminEmails.includes(String(session.user.email || "").toLowerCase())) throw new Error("Forbidden")
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

export async function GET(request: NextRequest, context: Params) {
  try {
    await requireAdmin(request)
  } catch {
    return notFound()
  }

  const { userId } = await context.params
  const rows = await supabaseSelect("user_overrides", `user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`).catch(() => [])
  return NextResponse.json({ override: rows?.[0] || null })
}

export async function DELETE(request: NextRequest, context: Params) {
  let admin
  try {
    admin = await requireAdmin(request)
  } catch {
    return notFound()
  }

  const { userId } = await context.params
  const oldRows = await supabaseSelect("user_overrides", `user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`).catch(() => [])
  const users = await supabaseSelect<{ email: string }>("users", `id=eq.${encodeURIComponent(userId)}&select=email&limit=1`).catch(() => [])
  await supabaseDelete("user_overrides", `user_id=eq.${encodeURIComponent(userId)}`)
  await writeAudit(admin.email, users?.[0]?.email || userId, "delete_override", oldRows?.[0] || null, null)
  return NextResponse.json({ deleted: true })
}
