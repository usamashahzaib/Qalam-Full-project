import { NextRequest, NextResponse } from "next/server"
import { loadPublicPitch } from "@/lib/server/agency/pitch"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

export async function GET(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const limited = await publicShareLimit(request, "pitch")
  if (limited) return limited
  const { token } = await context.params
  const pitch = await loadPublicPitch(token).catch(() => null)
  if (!pitch) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({ pitch }, { headers: { "Cache-Control": "no-store" } })
}
