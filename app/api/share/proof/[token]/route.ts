import { NextRequest, NextResponse } from "next/server"
import { loadPublicProof } from "@/lib/server/agency/proof"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const limited = await publicShareLimit(request, "proof")
  if (limited) return limited
  const { token } = await context.params
  const snapshot = await loadPublicProof(token).catch(() => null)
  if (!snapshot) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({ snapshot }, { headers: { "Cache-Control": "no-store" } })
}
