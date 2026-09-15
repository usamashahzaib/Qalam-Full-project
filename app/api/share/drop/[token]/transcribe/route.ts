import { NextRequest, NextResponse } from "next/server"
import { loadVoiceDropByToken, voiceDropStatus } from "@/lib/server/agency/voice-drops"
import { publicShareLimit } from "@/lib/server/agency/public-limit"
import { MAX_AUDIO_BYTES, isAllowedAudioType, transcribeVoiceNote } from "@/lib/server/agency/transcribe"
import { log } from "@/lib/server/logging"

export const maxDuration = 60
export const runtime = "nodejs"

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
  const limited = await publicShareLimit(request, "drop-transcribe")
  if (limited) return limited
  const { token } = await context.params
  const drop = await loadVoiceDropByToken(token).catch(() => null)
  if (!drop) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (voiceDropStatus(drop.row) !== "waiting") return NextResponse.json({ error: "already_answered" }, { status: 409 })

  const form = await request.formData().catch(() => null)
  const file = form?.get("audio")
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "audio_required" }, { status: 400 })
  if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "audio_too_large" }, { status: 413 })
  if (!isAllowedAudioType(file.type)) return NextResponse.json({ error: "audio_type_unsupported" }, { status: 415 })

  try {
    const extension = file.type.includes("mp4") || file.type.includes("m4a") ? "m4a" : file.type.includes("ogg") ? "ogg" : file.type.includes("mpeg") ? "mp3" : file.type.includes("wav") ? "wav" : "webm"
    const text = await transcribeVoiceNote(file, `voice-note.${extension}`)
    return NextResponse.json({ text })
  } catch (error) {
    log.error("agency.voice_drop_transcribe_failed", { error: (error as Error).message })
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 })
  }
}
