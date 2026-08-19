import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { mintExtensionToken } from "@/lib/server/extension-auth"

export async function POST(request: NextRequest) {
  return withAuth(async (_request, user) => {
    try {
      return NextResponse.json(
        { token: mintExtensionToken({ userId: user.id, workspaceId: user.workspaceId }), expiresInDays: 7 },
        { headers: { "Cache-Control": "no-store" } }
      )
    } catch {
      return NextResponse.json({ error: "extension_auth_not_configured" }, { status: 503 })
    }
  })(request)
}
