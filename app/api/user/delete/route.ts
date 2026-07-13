import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { createServiceClient } from "@/lib/server/supabase-rest"
import { log } from "@/lib/server/logging"

export async function DELETE(request: NextRequest) {
  return withAuth(async (_req, user) => {
    const supabase = createServiceClient()

    const { error } = await supabase.rpc("delete_user_data", {
      target_user_id: user.id,
    })

    if (error) {
      log.error("gdpr.delete.failed", { userId: user.id, msg: error.message })
      return NextResponse.json({ error: "deletion_failed" }, { status: 500 })
    }

    log.info("gdpr.delete.complete", { userId: user.id })

    // Clear session cookies so the deleted user's JWT cannot be reused.
    // NextAuth v5 uses "authjs.session-token" / "__Secure-authjs.session-token";
    // "next-auth.session-token" is kept for sessions issued before the v5 migration.
    const response = NextResponse.json({ success: true })
    const cookieNames = [
      "next-auth.session-token",
      "authjs.session-token",
      "__Secure-authjs.session-token",
    ]
    for (const name of cookieNames) {
      response.cookies.set(name, "", { expires: new Date(0), path: "/" })
    }
    return response
  })(request)
}
