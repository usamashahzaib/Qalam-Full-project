import { NextRequest, NextResponse } from "next/server"
import { withAuth } from "@/lib/server/auth"
import { mintExtensionToken } from "@/lib/server/extension-auth"
import { createServiceClient } from "@/lib/server/supabase-rest"

export async function POST(request: NextRequest) {
  return withAuth(async (_request, user) => {
    try {
      const { data: account, error } = await createServiceClient()
        .from("users")
        .select("password_version")
        .eq("id", user.id)
        .maybeSingle()
      if (error || !account || typeof account.password_version !== "number") {
        return NextResponse.json({ error: "extension_auth_unavailable" }, { status: 503 })
      }
      return NextResponse.json(
        { token: mintExtensionToken({ userId: user.id, passwordVersion: account.password_version }), expiresInDays: 7 },
        { headers: { "Cache-Control": "no-store" } }
      )
    } catch {
      return NextResponse.json({ error: "extension_auth_not_configured" }, { status: 503 })
    }
  })(request)
}
