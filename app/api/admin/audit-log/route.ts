import { NextRequest, NextResponse } from "next/server"
import { requireAdminRequest } from "@/lib/server/workspace"
import { supabaseSelect } from "@/lib/server/supabase-rest"

const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 })

export async function GET(request: NextRequest) {
  try {
    await requireAdminRequest(request)
  } catch {
    return notFound()
  }

  const auditLog = await supabaseSelect(
    "admin_audit_log",
    "select=id,admin_email,target_user_email,action,old_value,new_value,created_at&order=created_at.desc&limit=50"
  ).catch(() => [])

  return NextResponse.json({ auditLog })
}
