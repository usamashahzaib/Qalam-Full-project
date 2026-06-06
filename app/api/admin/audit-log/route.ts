import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })
const requireAdmin = async () => {
  const { userId, sessionClaims } = await auth()
  if (!userId) throw new Error("Unauthorized")
  const claims = sessionClaims as { metadata?: { admin?: boolean }; email?: string }
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.APP_ADMIN_EMAILS || "").split(",").map((v) => v.trim().toLowerCase())
  if (!claims?.metadata?.admin && !adminEmails.includes(String(claims?.email || "").toLowerCase())) throw new Error("Forbidden")
  return userId
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
