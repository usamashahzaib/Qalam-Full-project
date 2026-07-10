import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { getAuthenticatedSession, isAdminEmail } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

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
  return session.user.id
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
  } catch {
    return notFound()
  }

  const auditLog = await supabaseSelect(
    "admin_audit_log",
    "select=id,admin_email,target_user_email,action,old_value,new_value,created_at&order=created_at.desc&limit=50"
  ).catch(() => [])

  return NextResponse.json({ auditLog })
}
