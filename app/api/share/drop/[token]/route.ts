import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { answerVoiceDrop, loadVoiceDropByToken, voiceDropStatus } from "@/lib/server/agency/voice-drops"
import { publicShareLimit } from "@/lib/server/agency/public-limit"

type Context = { params: Promise<{ token: string }> }

const answerSchema = z.object({
  answer: z.string().trim().min(3).max(8000),
  kind: z.enum(["text", "voice"]).optional().default("text"),
})

export async function GET(request: NextRequest, context: Context) {
  const limited = await publicShareLimit(request, "drop")
  if (limited) return limited
  const { token } = await context.params
  const drop = await loadVoiceDropByToken(token).catch(() => null)
  if (!drop) return NextResponse.json({ error: "not_found" }, { status: 404 })
  return NextResponse.json({
    question: drop.row.question,
    workspaceName: drop.workspaceName,
    askerName: drop.askerName,
    status: voiceDropStatus(drop.row),
    expiresAt: drop.row.expires_at,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest, context: Context) {
  const limited = await publicShareLimit(request, "drop")
  if (limited) return limited
  const { token } = await context.params
  const drop = await loadVoiceDropByToken(token).catch(() => null)
  if (!drop) return NextResponse.json({ error: "not_found" }, { status: 404 })
  const status = voiceDropStatus(drop.row)
  if (status !== "waiting") return NextResponse.json({ error: status === "expired" ? "expired" : "already_answered" }, { status: 409 })

  const parsed = answerSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 })
  try {
    await answerVoiceDrop(drop.row, parsed.data.answer, parsed.data.kind)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = (error as Error).message
    return NextResponse.json({ error: message === "drop_unavailable" ? "already_answered" : "server_error" }, { status: message === "drop_unavailable" ? 409 : 500 })
  }
}
