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
    return NextResponse.json({ success: true })
  })(request)
}
