import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseDelete, supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async () => {
  const { userId, sessionClaims } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const claims = sessionClaims as { metadata?: { admin?: boolean }; email?: string }
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.APP_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase())
  if (!claims?.metadata?.admin && !adminEmails.includes(String(claims?.email || "").toLowerCase())) throw new Error("Forbidden")
  return { email: String(claims?.email || ""), userId }
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
    await requireAdmin()
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
    admin = await requireAdmin()
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
