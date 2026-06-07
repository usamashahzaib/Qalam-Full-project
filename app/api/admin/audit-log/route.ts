import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/server/auth-helpers"
import { supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async () => {
  const session = await getAuthenticatedSession()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.APP_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase())
  if (!adminEmails.includes(String(session.user.email || "").toLowerCase())) throw new Error("Forbidden")
  return session.user.id
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return notFound()
  }

  const auditLog = await supabaseSelect(
    "admin_audit_log",
    "select=id,admin_email,target_user_email,action,old_value,new_value,created_at&order=created_at.desc&limit=50"
  ).catch(() => [])

  return NextResponse.json({ auditLog })
}
